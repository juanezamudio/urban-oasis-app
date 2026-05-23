import { useState, useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import type { Product } from '../types';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Save the item to the current sale (and persist to catalog if saveToDatabase). */
  onAdd: (product: Product, saveToDatabase: boolean) => void;
  /** Persist the item to the catalog without adding it to the sale (continuous add). */
  onAddAnother: (product: Product) => void | Promise<void>;
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

export function CustomItemModal({ isOpen, onClose, onAdd, onAddAnother, categories }: CustomItemModalProps) {
  const isAdmin = useAuthStore((state) => state.role) === 'admin';
  const [name, setName] = useState('');
  const [priceCents, setPriceCents] = useState(''); // Store as cents string (e.g., "1299" for $12.99)
  const [unit, setUnit] = useState<'each' | 'lb'>('each');
  const [category, setCategory] = useState('');
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setPriceCents('');
    setUnit('each');
    setCategory('');
    setSaveToDatabase(false);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      setLastAdded(null);
    }
  }, [isOpen]);

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
  const isValid = name.trim().length > 0 && priceValue > 0;

  const buildProduct = (): Product => ({
    id: `custom-${Date.now()}`,
    name: normalizeName(name),
    price: priceValue,
    unit,
    category: category.trim() || 'Other',
    active: true,
    updatedAt: new Date(),
  });

  const handleSave = () => {
    if (!isValid) return;
    onAdd(buildProduct(), saveToDatabase);
    onClose();
  };

  const handleAddAnother = async () => {
    if (!isValid) return;
    const product = buildProduct();
    await onAddAnother(product);
    setLastAdded(product.name);
    resetForm();
    nameRef.current?.focus();
  };

  const suggestions = categories.filter((c) => c && c !== 'Other');

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-4">
          Add Custom Item
        </h2>

        {lastAdded && (
          <div className="mb-4 p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-emerald-800">
              Added <span className="font-semibold">{lastAdded}</span> to products
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <Input
            ref={nameRef}
            label="Item Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Specialty Jam"
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Price</label>
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
              <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
                {(['each', 'lb'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                      unit === u ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    {u === 'each' ? 'each' : 'per lb'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isAdmin ? (
            <div>
              <Input
                label="Category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Vegetables"
              />
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestions.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
                        category === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {[...suggestions, 'Other'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'text-sm px-3 py-1.5 rounded-full font-medium transition-colors',
                      category === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

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

        <div className="space-y-2">
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" className="flex-1" onClick={handleSave} disabled={!isValid}>
              Save
            </Button>
            <Button type="button" size="sm" variant="primary" className="flex-1" onClick={handleAddAnother} disabled={!isValid}>
              Save & Add Another
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
