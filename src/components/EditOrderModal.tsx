import { useState, useEffect, useMemo } from 'react';
import type { Order, OrderItem, Product, PaymentMethod, DiscountType } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { AddItemModal } from './AddItemModal';
import { DiscountModal } from './DiscountModal';
import { cn, formatCurrency, calculateLineTotal, generateId } from '../lib/utils';

interface DraftItem extends OrderItem {
  key: string;
}

interface DraftDiscount {
  type: DiscountType;
  value: number;
  label: string;
}

const NO_DISCOUNT: DraftDiscount = { type: 'none', value: 0, label: '' };

const PAYMENT_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash' },
  { method: 'card', label: 'Card' },
  { method: 'voucher', label: 'Voucher' },
];

interface EditOrderModalProps {
  isOpen: boolean;
  order: Order | null;
  products: Product[];
  onClose: () => void;
  onSave: (
    orderId: string,
    updates: {
      items: OrderItem[];
      subtotal: number;
      total: number;
      paymentMethod: PaymentMethod;
      discount: { type: DiscountType; value: number; label: string; amount: number } | null;
    }
  ) => Promise<void>;
}

function computeDiscountAmount(discount: DraftDiscount, subtotal: number): number {
  if (discount.type === 'none' || discount.value <= 0) return 0;
  if (discount.type === 'percentage') {
    return Math.round((subtotal * discount.value / 100) * 100) / 100;
  }
  return Math.min(subtotal, discount.value);
}

// Synthesize a Product from a draft line so the keypad modal can reuse it.
function productFromItem(item: DraftItem): Product {
  return {
    id: `edit-${item.key}`,
    name: item.name,
    price: item.price,
    unit: item.unit,
    category: '',
    active: true,
    updatedAt: new Date(),
  };
}

export function EditOrderModal({ isOpen, order, products, onClose, onSave }: EditOrderModalProps) {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [discount, setDiscount] = useState<DraftDiscount>(NO_DISCOUNT);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSaving, setIsSaving] = useState(false);

  // Sub-modals
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  // Target for the quantity keypad: a product to add, or an existing line to edit.
  const [quantityTarget, setQuantityTarget] = useState<{ product: Product; lineKey?: string } | null>(null);

  useEffect(() => {
    if (isOpen && order) {
      setItems(
        order.items.map((item) => ({ ...item, key: generateId() }))
      );
      setDiscount(
        order.discount
          ? { type: order.discount.type, value: order.discount.value, label: order.discount.label }
          : NO_DISCOUNT
      );
      setPaymentMethod(order.paymentMethod);
      setIsSaving(false);
    }
  }, [isOpen, order]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.lineTotal, 0),
    [items]
  );
  const discountAmount = useMemo(
    () => computeDiscountAmount(discount, subtotal),
    [discount, subtotal]
  );
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const hasDiscount = discount.type !== 'none' && discountAmount > 0;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q))
      : products;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, productSearch]);

  if (!order) return null;

  const adjustQuantity = (key: string, nextQuantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, quantity: nextQuantity, lineTotal: calculateLineTotal(item.price, nextQuantity) }
          : item
      )
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleQuantityConfirm = (product: Product, quantity: number) => {
    if (quantityTarget?.lineKey) {
      adjustQuantity(quantityTarget.lineKey, quantity);
    } else {
      setItems((prev) => [
        ...prev,
        {
          key: generateId(),
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity,
          lineTotal: calculateLineTotal(product.price, quantity),
        },
      ]);
    }
    setQuantityTarget(null);
  };

  const handleSave = async () => {
    if (items.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const cleanItems: OrderItem[] = items.map(({ name, price, unit, quantity, lineTotal }) => ({
        name,
        price,
        unit,
        quantity,
        lineTotal,
      }));
      await onSave(order.id, {
        items: cleanItems,
        subtotal,
        total,
        paymentMethod,
        discount: hasDiscount
          ? { type: discount.type, value: discount.value, label: discount.label, amount: discountAmount }
          : null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const editingLine = quantityTarget?.lineKey
    ? items.find((i) => i.key === quantityTarget.lineKey)
    : null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} noInternalScroll noBottomPadding>
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="flex-shrink-0 p-4 pb-3 border-b border-stone-400/40">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-stone-900">Edit Order</h2>
                <p className="text-xs text-stone-500">Order #{order.id.slice(-6).toUpperCase()}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Items */}
            <div className="divide-y divide-stone-400/40">
              {items.map((item) => (
                <div key={item.key} className="py-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 truncate">{item.name}</p>
                    <p className="text-sm text-stone-600">
                      {formatCurrency(item.price)}/{item.unit}
                    </p>
                  </div>

                  {/* Quantity stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const step = item.unit === 'lb' ? 0.5 : 1;
                        const next = Math.round((item.quantity - step) * 100) / 100;
                        if (next <= 0) {
                          removeItem(item.key);
                        } else {
                          adjustQuantity(item.key, next);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setQuantityTarget({ product: productFromItem(item), lineKey: item.key })}
                      className="w-12 text-center font-medium text-stone-900 hover:text-emerald-700 transition-colors"
                      title="Tap to set exact quantity"
                    >
                      {item.quantity}
                    </button>
                    <button
                      onClick={() => {
                        const step = item.unit === 'lb' ? 0.5 : 1;
                        adjustQuantity(item.key, Math.round((item.quantity + step) * 100) / 100);
                      }}
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
                    onClick={() => removeItem(item.key)}
                    className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                    title="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-500">
                  No items. Add at least one to save.
                </p>
              )}
            </div>

            {/* Add item */}
            <button
              onClick={() => {
                setProductSearch('');
                setShowProductPicker(true);
              }}
              className="w-full mt-3 py-2 px-3 border border-dashed border-stone-400 rounded-lg text-sm text-stone-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>

            {/* Discount */}
            <button
              onClick={() => setShowDiscountModal(true)}
              className="w-full mt-3 py-2 px-3 border border-dashed border-stone-400 rounded-lg text-sm text-stone-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {hasDiscount ? 'Change Discount' : 'Add Discount'}
            </button>

            {/* Payment method */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Payment Method</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(({ method, label }) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      paymentMethod === method
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-stone-400/40">
              {hasDiscount && (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-stone-600">Subtotal</span>
                    <span className="text-sm text-stone-600">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-emerald-600 font-medium">{discount.label}</span>
                      <button
                        onClick={() => setDiscount(NO_DISCOUNT)}
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
              <div className="flex justify-between items-center">
                <span className="font-display text-lg font-medium text-stone-700">Total</span>
                <span className="font-display text-2xl font-bold text-emerald-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 pt-3 border-t border-stone-400/40 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product picker for adding items */}
      <Modal isOpen={showProductPicker} onClose={() => setShowProductPicker(false)} noInternalScroll noBottomPadding>
        <div className="flex flex-col h-full max-h-[85vh]">
          <div className="flex-shrink-0 p-4 pb-3 border-b border-stone-400/40">
            <h2 className="font-display text-xl font-semibold text-stone-900 mb-3">Add Item</h2>
            <Input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-stone-400/40">
            {filteredProducts.length === 0 ? (
              <p className="p-6 text-center text-sm text-stone-500">No products found</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    setShowProductPicker(false);
                    setQuantityTarget({ product });
                  }}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-200/60 transition-colors"
                >
                  <span className="font-medium text-stone-900">{product.name}</span>
                  <span className="font-semibold text-emerald-700 whitespace-nowrap ml-2">
                    {formatCurrency(product.price)}/{product.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Quantity keypad (add or edit a line) */}
      <AddItemModal
        product={quantityTarget?.product ?? null}
        isOpen={quantityTarget !== null}
        onClose={() => setQuantityTarget(null)}
        onAdd={handleQuantityConfirm}
        initialQuantity={editingLine ? editingLine.quantity : undefined}
        confirmLabel={quantityTarget?.lineKey ? 'Update Quantity' : 'Add Item'}
      />

      {/* Discount editor */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        subtotal={subtotal}
        currentDiscount={discount}
        onApply={(type, value, label) => setDiscount({ type, value, label })}
        onRemove={() => setDiscount(NO_DISCOUNT)}
      />
    </>
  );
}
