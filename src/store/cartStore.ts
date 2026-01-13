import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, DiscountType } from '../types';
import { calculateLineTotal, generateId } from '../lib/utils';

interface CartDiscount {
  type: DiscountType;
  value: number;
  label: string;
}

interface CartState {
  items: CartItem[];
  discount: CartDiscount;
  addItem: (product: Product, quantity: number) => void;
  updateItem: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  restoreItems: (items: CartItem[]) => void;
  applyDiscount: (type: DiscountType, value: number, label: string) => void;
  removeDiscount: () => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const DEFAULT_DISCOUNT: CartDiscount = { type: 'none', value: 0, label: '' };

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: DEFAULT_DISCOUNT,

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
        set({ items: [], discount: DEFAULT_DISCOUNT });
      },

      restoreItems: (items: CartItem[]) => {
        set({ items });
      },

      applyDiscount: (type, value, label) => {
        set({ discount: { type, value, label } });
      },

      removeDiscount: () => {
        set({ discount: DEFAULT_DISCOUNT });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.lineTotal, 0);
      },

      getDiscountAmount: () => {
        const { discount } = get();
        const subtotal = get().getSubtotal();

        if (discount.type === 'none' || discount.value <= 0) {
          return 0;
        }

        if (discount.type === 'percentage') {
          return Math.round((subtotal * discount.value / 100) * 100) / 100;
        }

        // Fixed discount
        return Math.min(subtotal, discount.value);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discountAmount = get().getDiscountAmount();
        return Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
      },

      getItemCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'uop-cart',
      partialize: (state) => ({ items: state.items, discount: state.discount }),
    }
  )
);
