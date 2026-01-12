import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Product } from '../types';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product, saveToDatabase: boolean) => void;
  categories: string[];
}

// Normalize item name to proper title case
function normalizeName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Handle common lowercase words that should stay lowercase (unless first word)
      const lowercaseWords = ['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'for', 'with'];
      if (lowercaseWords.includes(word)) return word;
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    // Always capitalize the first letter of the entire string
    .replace(/^./, char => char.toUpperCase());
}

export function CustomItemModal({ isOpen, onClose, onAdd, categories }: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [priceCents, setPriceCents] = useState(''); // Store as cents string (e.g., "1299" for $12.99)
  const [unit, setUnit] = useState<'each' | 'lb'>('each');
  const [category, setCategory] = useState('');
  const [saveToDatabase, setSaveToDatabase] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPriceCents('');
      setUnit('each');
      setCategory(categories[0] || 'Other');
      setSaveToDatabase(false);
    }
  }, [isOpen, categories]);

  // Format cents to display value (e.g., "1299" -> "12.99")
  const formatPriceDisplay = (cents: string): string => {
    if (!cents) return '';
    const paddedCents = cents.padStart(3, '0');
    const dollars = paddedCents.slice(0, -2);
    const centsDisplay = paddedCents.slice(-2);
    return `${parseInt(dollars, 10)}.${centsDisplay}`;
  };

  // Handle price input - only allow digits, auto-format as currency
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setPriceCents(value);
  };

  const displayPrice = formatPriceDisplay(priceCents);
  const priceValue = priceCents ? parseInt(priceCents, 10) / 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || priceValue <= 0) {
      return;
    }

    const normalizedName = normalizeName(name);

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: normalizedName,
      price: priceValue,
      unit,
      category: category || 'Other',
      active: true,
      updatedAt: new Date(),
    };

    onAdd(customProduct, saveToDatabase);
    onClose();
  };

  const isValid = name.trim() && priceValue > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-6">
          Add Custom Item
        </h2>

        <div className="space-y-4 mb-6">
          <Input
            label="Item Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Specialty Jam"
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Price
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayPrice}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                />
              </div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'each' | 'lb')}
                className="px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534e%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_8px_center] bg-no-repeat pr-10"
              >
                <option value="each">each</option>
                <option value="lb">per lb</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 pr-10 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534e%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
            >
              {categories.filter(cat => cat !== 'Other').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToDatabase}
              onChange={(e) => setSaveToDatabase(e.target.checked)}
              className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-stone-700">
              Save to products for future use
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={!isValid}
          >
            Continue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
