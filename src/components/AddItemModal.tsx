import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { NumericKeypad } from './NumericKeypad';
import { formatCurrency, formatPrice, calculateLineTotal } from '../lib/utils';

interface AddItemModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product, quantity: number) => void;
}

export function AddItemModal({ product, isOpen, onClose, onAdd }: AddItemModalProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue('');
    }
  }, [isOpen, product]);

  if (!product) return null;

  const quantity = parseFloat(value) || 0;
  const lineTotal = calculateLineTotal(product.price, quantity);
  const isValid = quantity > 0;

  const handleAdd = () => {
    if (isValid) {
      onAdd(product, quantity);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        {/* Product Info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-1">{product.name}</h2>
          <p className="text-emerald-700 font-semibold">
            {formatPrice(product.price, product.unit)}
          </p>
        </div>

        {/* Input Display */}
        <div className="bg-stone-200 rounded-2xl p-4 mb-4 border border-stone-400/50">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-stone-900">
              {value || '0'}
            </span>
            <span className="text-xl text-stone-600">
              {product.unit === 'lb' ? 'lbs' : 'qty'}
            </span>
          </div>
          {isValid && (
            <p className="text-center text-lg text-emerald-700 font-semibold mt-2">
              Total: {formatCurrency(lineTotal)}
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="mb-6">
          <NumericKeypad
            value={value}
            onChange={setValue}
            allowDecimal={product.unit === 'lb'}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleAdd}
            disabled={!isValid}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Modal>
  );
}
