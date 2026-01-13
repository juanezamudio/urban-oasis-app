import type { Product } from '../types';
import { formatPrice } from '../lib/utils';
import { cn } from '../lib/utils';
import { useFavoritesStore } from '../store/favoritesStore';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  showFavoriteButton?: boolean;
}

const categoryColors: Record<string, string> = {
  Vegetables: 'bg-emerald-600/20 text-emerald-700',
  Fruits: 'bg-orange-500/20 text-orange-700',
  Herbs: 'bg-green-600/20 text-green-700',
  Dairy: 'bg-amber-500/20 text-amber-700',
  'Dairy & Eggs': 'bg-amber-500/20 text-amber-700',
  Other: 'bg-stone-400/20 text-stone-600',
};

export function ProductCard({ product, onClick, showFavoriteButton = true }: ProductCardProps) {
  const colorClass = categoryColors[product.category] || categoryColors.Other;
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const favorited = isFavorite(product.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(product);
        }
      }}
      className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 hover:bg-stone-200 hover:border-stone-400 hover:shadow-lg transition-all active:scale-[0.98] text-left w-full shadow-sm relative cursor-pointer"
    >
      {showFavoriteButton && (
        <button
          onClick={handleFavoriteClick}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full transition-all',
            favorited
              ? 'text-amber-500 bg-amber-500/20'
              : 'text-stone-400 hover:text-amber-500 hover:bg-amber-500/10'
          )}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            className="w-4 h-4"
            fill={favorited ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      )}
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
        <p className="font-display text-emerald-700 font-bold text-xl mt-auto">
          {formatPrice(product.price, product.unit)}
        </p>
      </div>
    </div>
  );
}
