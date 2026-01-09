import type { Product } from '../types';
import { formatPrice } from '../lib/utils';
import { cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

const categoryColors: Record<string, string> = {
  Vegetables: 'bg-emerald-600/20 text-emerald-700',
  Fruits: 'bg-orange-500/20 text-orange-700',
  Herbs: 'bg-green-600/20 text-green-700',
  Dairy: 'bg-amber-500/20 text-amber-700',
  'Dairy & Eggs': 'bg-amber-500/20 text-amber-700',
  Other: 'bg-stone-400/20 text-stone-600',
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  const colorClass = categoryColors[product.category] || categoryColors.Other;

  return (
    <button
      onClick={() => onClick(product)}
      className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 hover:bg-stone-200 hover:border-stone-400 hover:shadow-lg transition-all active:scale-[0.98] text-left w-full shadow-sm"
    >
      <div className="flex flex-col h-full">
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full self-start mb-2',
            colorClass
          )}
        >
          {product.category}
        </span>
        <h3 className="font-semibold text-stone-900 text-base leading-tight mb-1">
          {product.name}
        </h3>
        <p className="text-emerald-700 font-bold text-xl mt-auto">
          {formatPrice(product.price, product.unit)}
        </p>
      </div>
    </button>
  );
}
