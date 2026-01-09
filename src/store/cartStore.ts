import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../types';
import { calculateLineTotal, generateId } from '../lib/utils';

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  updateItem: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity) => {
        const lineTotal = calculateLineTotal(product.price, quantity);
        const newItem: CartItem = {
          id: generateId(),
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity,
          lineTotal,
        };

        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      updateItem: (itemId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity,
                  lineTotal: calculateLineTotal(item.price, quantity),
                }
              : item
          ),
        }));
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.lineTotal, 0);
      },

      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'uop-cart',
    }
  )
);
