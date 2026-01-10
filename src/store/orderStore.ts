import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, CartItem } from '../types';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { generateId, getDeviceId, getTodayStart, isSameDay } from '../lib/utils';

interface OrderState {
  orders: Order[];
  allOrders: Order[];
  isLoading: boolean;
  error: string | null;
  setOrders: (orders: Order[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  createOrder: (items: CartItem[], total: number) => Promise<Order>;
  subscribeToTodaysOrders: () => () => void;
  subscribeToOrdersByDateRange: (startDate: Date, endDate: Date) => () => void;
  getOrdersByDateRange: (startDate: Date, endDate: Date) => Order[];
  getTodayTotal: () => number;
  getTodayOrderCount: () => number;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      allOrders: [],
      isLoading: false,
      error: null,

      setOrders: (orders) => set({ orders }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      createOrder: async (items, total) => {
        const order: Order = {
          id: generateId(),
          items: items.map((item) => ({
            name: item.name,
            price: item.price,
            unit: item.unit,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
          total,
          createdAt: new Date(),
          createdBy: getDeviceId(),
          synced: !isFirebaseConfigured,
        };

        // If Firebase is configured, try to save there
        if (isFirebaseConfigured && db) {
          try {
            const { collection, addDoc, Timestamp } = await import('firebase/firestore');
            const ordersRef = collection(db, 'orders');
            await addDoc(ordersRef, {
              items: order.items,
              total: order.total,
              createdAt: Timestamp.fromDate(order.createdAt),
              createdBy: order.createdBy,
            });
            order.synced = true;
          } catch (error) {
            console.warn('Failed to sync order to Firebase, saving locally:', error);
          }
        }

        // Always save to local state
        set((state) => ({
          orders: [order, ...state.orders],
          allOrders: [order, ...state.allOrders],
        }));

        return order;
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
    }),
    {
      name: 'uop-orders',
      partialize: (state) => ({ allOrders: state.allOrders }),
    }
  )
);
