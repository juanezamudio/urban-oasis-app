import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../lib/utils';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface CartProps {
  onCheckout: () => void;
  isProcessing?: boolean;
}

export function Cart({ onCheckout, isProcessing }: CartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { items, removeItem, clearCart, getTotal, getItemCount } = useCartStore();

  const total = getTotal();
  const itemCount = getItemCount();

  if (itemCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Cart Bar - positioned above bottom nav */}
      <div className="fixed bottom-[5.5rem] sm:bottom-[6.5rem] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
        <div data-tour="cart" className="bg-stone-800 rounded-2xl border border-stone-700 shadow-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex-1 flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-stone-400">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
                <p className="font-display text-xl font-bold text-stone-50">
                  {formatCurrency(total)}
                </p>
              </div>
            </button>
            <Button
              data-tour="checkout"
              variant="primary"
              size="lg"
              onClick={onCheckout}
              disabled={isProcessing}
              className="px-8"
            >
              {isProcessing ? 'Processing...' : 'Complete Order'}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Cart Modal */}
      <Modal isOpen={isExpanded} onClose={() => setIsExpanded(false)}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-stone-900">Cart</h2>
            <button
              onClick={clearCart}
              className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto divide-y divide-stone-400/50">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{item.name}</p>
                  <p className="text-sm text-stone-600">
                    {item.quantity} {item.unit === 'lb' ? 'lbs' : ''} x{' '}
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <p className="font-semibold text-emerald-700">
                  {formatCurrency(item.lineTotal)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-400/50 mt-4 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-display text-lg font-medium text-stone-700">Total</span>
              <span className="font-display text-2xl font-bold text-emerald-700">
                {formatCurrency(total)}
              </span>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                setIsExpanded(false);
                onCheckout();
              }}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Complete Order'}
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
