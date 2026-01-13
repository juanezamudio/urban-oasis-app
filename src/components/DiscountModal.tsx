import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useCartStore } from '../store/cartStore';
import { formatCurrency, cn } from '../lib/utils';
import type { DiscountType } from '../types';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetDiscount {
  label: string;
  type: DiscountType;
  value: number;
}

const PRESET_DISCOUNTS: PresetDiscount[] = [
  { label: '10% Off', type: 'percentage', value: 10 },
  { label: '20% Off', type: 'percentage', value: 20 },
  { label: 'Senior (15%)', type: 'percentage', value: 15 },
  { label: 'End of Day (25%)', type: 'percentage', value: 25 },
];

export function DiscountModal({ isOpen, onClose }: DiscountModalProps) {
  const { getSubtotal, applyDiscount, discount, removeDiscount } = useCartStore();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [customValue, setCustomValue] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  const subtotal = getSubtotal();

  const calculateDiscountAmount = (type: DiscountType, value: number) => {
    if (type === 'percentage') {
      return Math.round((subtotal * value / 100) * 100) / 100;
    }
    return Math.min(subtotal, value);
  };

  const handlePresetClick = (preset: PresetDiscount) => {
    applyDiscount(preset.type, preset.value, preset.label);
    onClose();
  };

  const handleCustomApply = () => {
    const value = parseFloat(customValue);
    if (value > 0) {
      const label = customLabel.trim() || `${discountType === 'percentage' ? `${value}%` : formatCurrency(value)} Off`;
      applyDiscount(discountType, value, label);
      setCustomValue('');
      setCustomLabel('');
      onClose();
    }
  };

  const handleRemoveDiscount = () => {
    removeDiscount();
    onClose();
  };

  const customDiscountAmount = customValue
    ? calculateDiscountAmount(discountType, parseFloat(customValue) || 0)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Apply Discount
        </h2>

        {/* Current discount */}
        {discount.type !== 'none' && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">{discount.label}</p>
              <p className="text-xs text-emerald-600">
                -{formatCurrency(calculateDiscountAmount(discount.type, discount.value))}
              </p>
            </div>
            <button
              onClick={handleRemoveDiscount}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        )}

        {/* Preset Discounts */}
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-700 mb-2">Quick Discounts</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_DISCOUNTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="p-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-left transition-colors"
              >
                <p className="font-medium text-stone-900">{preset.label}</p>
                <p className="text-sm text-emerald-600">
                  -{formatCurrency(calculateDiscountAmount(preset.type, preset.value))}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Discount */}
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-700 mb-2">Custom Discount</p>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setDiscountType('percentage')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                discountType === 'percentage'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              Percentage (%)
            </button>
            <button
              onClick={() => setDiscountType('fixed')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                discountType === 'fixed'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              Fixed Amount ($)
            </button>
          </div>

          {/* Value Input */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                {discountType === 'percentage' ? '%' : '$'}
              </span>
              <input
                type="number"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '15' : '5.00'}
                className="w-full pl-8 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Label Input */}
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Label (optional, e.g., 'Staff Discount')"
            className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-3"
          />

          {/* Preview */}
          {customValue && parseFloat(customValue) > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
              <p className="text-sm text-amber-800">
                Discount: <span className="font-semibold">-{formatCurrency(customDiscountAmount)}</span>
              </p>
              <p className="text-xs text-amber-600">
                New total: {formatCurrency(Math.max(0, subtotal - customDiscountAmount))}
              </p>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleCustomApply}
            disabled={!customValue || parseFloat(customValue) <= 0}
          >
            Apply Custom Discount
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
