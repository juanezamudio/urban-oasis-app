import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, CartItem, PaymentMethod, OrderDiscount } from '../types';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { generateId, getDeviceId, getTodayStart, isSameDay } from '../lib/utils';

interface OrderState {
  orders: Order[];
  allOrders: Order[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  setOrders: (orders: Order[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createOrder: (
    items: CartItem[],
    subtotal: number,
    total: number,
    paymentMethod: PaymentMethod,
    discount?: OrderDiscount
  ) => Promise<Order>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteOrders: (orderIds: string[]) => Promise<void>;
  subscribeToTodaysOrders: () => () => void;
  subscribeToOrdersByDateRange: (startDate: Date, endDate: Date) => () => void;
  getOrdersByDateRange: (startDate: Date, endDate: Date) => Order[];
  getTodayTotal: () => number;
  getTodayOrderCount: () => number;
  getPendingCount: () => number;
  syncPendingOrders: () => Promise<void>;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      allOrders: [],
      isLoading: false,
      isSyncing: false,
      error: null,

      setOrders: (orders) => set({ orders }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      createOrder: async (items, subtotal, total, paymentMethod, discount) => {
        const orderData: {
          items: { name: string; price: number; unit: 'lb' | 'each'; quantity: number; lineTotal: number }[];
          subtotal: number;
          discount?: OrderDiscount;
          total: number;
          paymentMethod: PaymentMethod;
          createdAt: Date;
          createdBy: string;
        } = {
          items: items.map((item) => ({
            name: item.name,
            price: item.price,
            unit: item.unit,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
          subtotal,
          total,
          paymentMethod,
          createdAt: new Date(),
          createdBy: getDeviceId(),
        };

        // Only add discount if it exists (Firebase doesn't accept undefined)
        if (discount) {
          orderData.discount = discount;
        }

        let order: Order;

        // If Firebase is configured, save there first to get the Firebase document ID
        if (isFirebaseConfigured && db) {
          try {
            const { collection, addDoc, Timestamp } = await import('firebase/firestore');
            const ordersRef = collection(db, 'orders');
            const docRef = await addDoc(ordersRef, {
              ...orderData,
              createdAt: Timestamp.fromDate(orderData.createdAt),
            });
            // Use Firebase document ID as the order ID
            order = {
              id: docRef.id,
              ...orderData,
              synced: true,
            };
          } catch (error) {
            console.warn('Failed to sync order to Firebase, saving locally:', error);
            // Fall back to local ID if Firebase fails
            order = {
              id: generateId(),
              ...orderData,
              synced: false,
            };
          }
        } else {
          // No Firebase, use local ID
          order = {
            id: generateId(),
            ...orderData,
            synced: false,
          };
        }

        // Save to local state
        set((state) => ({
          orders: [order, ...state.orders],
          allOrders: [order, ...state.allOrders],
        }));

        return order;
      },

      deleteOrder: async (orderId: string) => {
        // Remove from local state first
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
          allOrders: state.allOrders.filter((order) => order.id !== orderId),
        }));

        // If Firebase is configured, try to delete there too
        if (isFirebaseConfigured && db) {
          try {
            const { doc, deleteDoc } = await import('firebase/firestore');
            const orderRef = doc(db, 'orders', orderId);
            await deleteDoc(orderRef);
          } catch (error) {
            console.error('Failed to delete order from Firebase:', error);
            throw error;
          }
        }
      },

      deleteOrders: async (orderIds: string[]) => {
        if (orderIds.length === 0) return;

        // Remove from local state first
        const idsToDelete = new Set(orderIds);
        set((state) => ({
          orders: state.orders.filter((order) => !idsToDelete.has(order.id)),
          allOrders: state.allOrders.filter((order) => !idsToDelete.has(order.id)),
        }));

        // If Firebase is configured, batch delete
        if (isFirebaseConfigured && db) {
          try {
            const { doc, writeBatch } = await import('firebase/firestore');
            const firestore = db; // TypeScript narrowing

            // Firebase batch limit is 500, so chunk if needed
            const chunks: string[][] = [];
            for (let i = 0; i < orderIds.length; i += 500) {
              chunks.push(orderIds.slice(i, i + 500));
            }

            for (const chunk of chunks) {
              const batch = writeBatch(firestore);
              chunk.forEach((orderId) => {
                const orderRef = doc(firestore, 'orders', orderId);
                batch.delete(orderRef);
              });
              await batch.commit();
            }
          } catch (error) {
            console.warn('Failed to delete orders from Firebase:', error);
          }
        }
      },

      subscribeToTodaysOrders: () => {
        // If Firebase is not configured, just filter local orders by today
        if (!isFirebaseConfigured || !db) {
          const today = getTodayStart();
          const todaysOrders = get().allOrders.filter((order) =>
            isSameDay(new Date(order.createdAt), today)
          );
          set({ orders: todaysOrders, isLoading: false });
          return () => {};
        }

        // Firebase subscription
        const connectFirebase = async () => {
          if (!db) return () => {};

          try {
            const { collection, onSnapshot, query, where, orderBy, Timestamp } = await import('firebase/firestore');

            set({ isLoading: true });

            const ordersRef = collection(db, 'orders');
            const todayStart = getTodayStart();
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const q = query(
              ordersRef,
              where('createdAt', '>=', Timestamp.fromDate(todayStart)),
              where('createdAt', '<=', Timestamp.fromDate(todayEnd)),
              orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(
              q,
              (snapshot) => {
                const orders: Order[] = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  paymentMethod: doc.data().paymentMethod || 'cash', // Default for old orders
                  createdAt: doc.data().createdAt?.toDate() || new Date(),
                  synced: true,
                })) as Order[];

                set({ orders, isLoading: false, error: null });
              },
              (error) => {
                console.error('Error fetching orders:', error);
                set({ error: error.message, isLoading: false });
              }
            );

            return unsubscribe;
          } catch (error) {
            console.warn('Firebase orders subscription failed');
            set({ isLoading: false });
            return () => {};
          }
        };

        let unsubscribe: (() => void) | null = null;
        connectFirebase().then((unsub) => {
          unsubscribe = unsub;
        });

        return () => {
          if (unsubscribe) unsubscribe();
        };
      },

      getOrdersByDateRange: (startDate: Date, endDate: Date) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return get().allOrders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= start && orderDate <= end;
        });
      },

      subscribeToOrdersByDateRange: (startDate: Date, endDate: Date) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // If Firebase is not configured, filter local orders
        if (!isFirebaseConfigured || !db) {
          const filteredOrders = get().allOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= start && orderDate <= end;
          });
          set({ orders: filteredOrders, isLoading: false });
          return () => {};
        }

        // Firebase subscription for date range
        const connectFirebase = async () => {
          if (!db) return () => {};

          try {
            const { collection, onSnapshot, query, where, orderBy, Timestamp } = await import('firebase/firestore');

            set({ isLoading: true });

            const ordersRef = collection(db, 'orders');

            const q = query(
              ordersRef,
              where('createdAt', '>=', Timestamp.fromDate(start)),
              where('createdAt', '<=', Timestamp.fromDate(end)),
              orderBy('createdAt', 'desc')
            );

            const unsubscribe = onSnapshot(
              q,
              (snapshot) => {
                const orders: Order[] = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  paymentMethod: doc.data().paymentMethod || 'cash', // Default for old orders
                  createdAt: doc.data().createdAt?.toDate() || new Date(),
                  synced: true,
                })) as Order[];

                set({ orders, isLoading: false, error: null });
              },
              (error) => {
                console.error('Error fetching orders:', error);
                set({ error: error.message, isLoading: false });
              }
            );

            return unsubscribe;
          } catch (error) {
            console.warn('Firebase orders subscription failed');
            set({ isLoading: false });
            return () => {};
          }
        };

        let unsubscribe: (() => void) | null = null;
        connectFirebase().then((unsub) => {
          unsubscribe = unsub;
        });

        return () => {
          if (unsubscribe) unsubscribe();
        };
      },

      getTodayTotal: () => {
        const today = getTodayStart();
        return get()
          .orders.filter((order) => isSameDay(new Date(order.createdAt), today))
          .reduce((sum, order) => sum + order.total, 0);
      },

      getTodayOrderCount: () => {
        const today = getTodayStart();
        return get().orders.filter((order) =>
          isSameDay(new Date(order.createdAt), today)
        ).length;
      },

      getPendingCount: () => {
        return get().allOrders.filter((order) => !order.synced).length;
      },

      syncPendingOrders: async () => {
        if (!isFirebaseConfigured || !db) return;

        const pendingOrders = get().allOrders.filter((order) => !order.synced);
        if (pendingOrders.length === 0) return;

        set({ isSyncing: true });

        try {
          const { collection, addDoc, Timestamp } = await import('firebase/firestore');
          const ordersRef = collection(db, 'orders');

          for (const order of pendingOrders) {
            try {
              await addDoc(ordersRef, {
                items: order.items,
                total: order.total,
                paymentMethod: order.paymentMethod,
                createdAt: Timestamp.fromDate(new Date(order.createdAt)),
                createdBy: order.createdBy,
                localId: order.id, // Keep reference to local ID
              });

              // Mark as synced
              set((state) => ({
                allOrders: state.allOrders.map((o) =>
                  o.id === order.id ? { ...o, synced: true } : o
                ),
                orders: state.orders.map((o) =>
                  o.id === order.id ? { ...o, synced: true } : o
                ),
              }));
            } catch (error) {
              console.warn(`Failed to sync order ${order.id}:`, error);
            }
          }
        } catch (error) {
          console.error('Error during sync:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'uop-orders',
      partialize: (state) => ({ allOrders: state.allOrders }),
    }
  )
);
