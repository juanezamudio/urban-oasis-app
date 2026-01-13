import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';
import { db, isFirebaseConfigured } from '../lib/firebase';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  useLocalStorage: boolean;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  subscribeToProducts: () => () => void;
  uploadProducts: (products: Product[]) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  clearAllProducts: () => Promise<void>;
  getCategories: () => string[];
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,
      error: null,
      useLocalStorage: !isFirebaseConfigured,

      setProducts: (products) => set({ products }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      subscribeToProducts: () => {
        // If Firebase is not configured, just use local storage
        if (!isFirebaseConfigured || !db) {
          set({ isLoading: false, useLocalStorage: true });
          return () => {};
        }

        // Try to connect to Firebase
        const connectFirebase = async () => {
          if (!db) return () => {};

          try {
            const { collection, onSnapshot, query, where } = await import('firebase/firestore');

            set({ isLoading: true });

            const productsRef = collection(db, 'products');
            const q = query(productsRef, where('active', '==', true));

            const unsubscribe = onSnapshot(
              q,
              (snapshot) => {
                const products: Product[] = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                })) as Product[];

                products.sort((a, b) => {
                  if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                  }
                  return a.name.localeCompare(b.name);
                });

                set({ products, isLoading: false, error: null, useLocalStorage: false });
              },
              (error) => {
                console.warn('Firebase error, using local storage:', error.message);
                set({ isLoading: false, useLocalStorage: true });
              }
            );

            return unsubscribe;
          } catch (error) {
            console.warn('Firebase connection failed, using local storage');
            set({ isLoading: false, useLocalStorage: true });
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

      uploadProducts: async (newProducts) => {
        // If Firebase is not configured, save locally
        if (!isFirebaseConfigured || !db) {
          const productsWithIds = newProducts.map((p, i) => ({
            ...p,
            id: p.id || `local-${Date.now()}-${i}`,
            updatedAt: new Date(),
          }));

          set({ products: productsWithIds, isLoading: false, useLocalStorage: true });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const { collection, writeBatch, doc, getDocs } = await import('firebase/firestore');

          const productsRef = collection(db, 'products');
          const existingSnapshot = await getDocs(productsRef);

          const batch = writeBatch(db);

          existingSnapshot.docs.forEach((docSnapshot) => {
            batch.delete(docSnapshot.ref);
          });

          newProducts.forEach((product) => {
            const newDocRef = doc(productsRef);
            batch.set(newDocRef, {
              name: product.name,
              price: product.price,
              unit: product.unit,
              category: product.category,
              active: true,
              updatedAt: new Date(),
            });
          });

          await batch.commit();
          set({ isLoading: false, useLocalStorage: false });
        } catch (error) {
          console.warn('Firebase upload failed, saving locally:', error);

          // Fallback: Save to local storage
          const productsWithIds = newProducts.map((p, i) => ({
            ...p,
            id: p.id || `local-${Date.now()}-${i}`,
            updatedAt: new Date(),
          }));

          set({ products: productsWithIds, isLoading: false, useLocalStorage: true });
        }
      },

      addProduct: async (product) => {
        // If Firebase is not configured, save locally
        if (!isFirebaseConfigured || !db) {
          const productWithId = {
            ...product,
            id: product.id || `local-${Date.now()}`,
            updatedAt: new Date(),
          };

          set((state) => ({
            products: [...state.products, productWithId],
            useLocalStorage: true,
          }));
          return;
        }

        try {
          const { collection, addDoc } = await import('firebase/firestore');

          const productsRef = collection(db, 'products');
          await addDoc(productsRef, {
            name: product.name,
            price: product.price,
            unit: product.unit,
            category: product.category,
            active: true,
            updatedAt: new Date(),
          });
          // Firebase subscription will update the local state automatically
        } catch (error) {
          console.warn('Firebase add product failed, saving locally:', error);

          const productWithId = {
            ...product,
            id: product.id || `local-${Date.now()}`,
            updatedAt: new Date(),
          };

          set((state) => ({
            products: [...state.products, productWithId],
            useLocalStorage: true,
          }));
        }
      },

      deleteProduct: async (productId: string) => {
        // Remove from local state first
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }));

        // If Firebase is configured, delete from there too
        if (isFirebaseConfigured && db) {
          try {
            const { doc, deleteDoc } = await import('firebase/firestore');
            const productRef = doc(db, 'products', productId);
            await deleteDoc(productRef);
          } catch (error) {
            console.warn('Failed to delete product from Firebase:', error);
          }
        }
      },

      clearAllProducts: async () => {
        const currentProducts = get().products;

        // Clear local state first
        set({ products: [] });

        // If Firebase is configured, delete all from there too
        if (isFirebaseConfigured && db) {
          try {
            const { collection, writeBatch, getDocs } = await import('firebase/firestore');
            const productsRef = collection(db, 'products');
            const snapshot = await getDocs(productsRef);

            if (snapshot.docs.length > 0) {
              const batch = writeBatch(db);
              snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
              });
              await batch.commit();
            }
          } catch (error) {
            console.warn('Failed to clear products from Firebase:', error);
            // Restore local state if Firebase delete failed
            set({ products: currentProducts });
          }
        }
      },

      getCategories: () => {
        const categories = new Set(get().products.map((p) => p.category));
        return Array.from(categories).sort();
      },
    }),
    {
      name: 'uop-products',
      partialize: (state) => ({ products: state.products }),
    }
  )
);
