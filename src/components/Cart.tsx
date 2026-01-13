import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { formatCurrency } from '../lib/utils';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { DiscountModal } from './DiscountModal';

interface CartProps {
  onCheckout: () => void;
  isProcessing?: boolean;
}

export function Cart({ onCheckout, isProcessing }: CartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const {
    items,
    updateItem,
    removeItem,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    getItemCount,
    discount,
    removeDiscount,
  } = useCartStore();

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();
  const itemCount = getItemCount();
  const hasDiscount = discount.type !== 'none' && discountAmount > 0;

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
            <div className="flex items-center gap-3">
              <button
                onClick={clearCart}
                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-stone-500 hover:text-stone-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto divide-y divide-stone-400/50">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{item.name}</p>
                  <p className="text-sm text-stone-600">
                    {formatCurrency(item.price)}/{item.unit}
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (item.quantity <= 1) {
                        removeItem(item.id);
                      } else {
                        updateItem(item.id, item.quantity - 1);
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="w-10 text-center font-medium text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <p className="font-semibold text-emerald-700 w-16 text-right">
                  {formatCurrency(item.lineTotal)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-stone-400 hover:text-red-600 transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-400/50 mt-4 pt-4">
            {/* Discount Button */}
            <button
              onClick={() => setShowDiscountModal(true)}
              className="w-full mb-3 py-2 px-3 border border-dashed border-stone-400 rounded-lg text-sm text-stone-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {hasDiscount ? 'Change Discount' : 'Add Discount'}
            </button>

            {/* Subtotal & Discount */}
            {hasDiscount && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-stone-600">Subtotal</span>
                  <span className="text-sm text-stone-600">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-emerald-600 font-medium">{discount.label}</span>
                    <button
                      onClick={removeDiscount}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <span className="text-sm text-emerald-600 font-medium">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              </>
            )}

            {/* Total */}
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

      {/* Discount Modal */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
      />
    </>
  );
}
