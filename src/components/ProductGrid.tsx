import { useState, useRef, useEffect } from 'react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { cn, formatPrice } from '../lib/utils';
import { useFavoritesStore } from '../store/favoritesStore';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onCustomItemClick: () => void;
  isLoading?: boolean;
  onScrollChange?: (isScrolled: boolean) => void;
}

export function ProductGrid({ products, onProductClick, onCustomItemClick, isLoading, onScrollChange }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { favoriteIds } = useFavoritesStore();
  const isCollapsedRef = useRef(false);

  // Reset header on mount
  useEffect(() => {
    isCollapsedRef.current = false;
    onScrollChange?.(false);
  }, []);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onScrollChange) return;
    const scrollTop = e.currentTarget.scrollTop;

    if (scrollTop > 60 && !isCollapsedRef.current) {
      isCollapsedRef.current = true;
      onScrollChange(true);
    } else if (scrollTop < 30 && isCollapsedRef.current) {
      isCollapsedRef.current = false;
      onScrollChange(false);
    }
  };

  // Get favorite products (maintain order from favoriteIds)
  const favoriteProducts = favoriteIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  // Get unique categories, with "Other" always last
  const categories = Array.from(new Set(products.map((p) => p.category)))
    .sort()
    .sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return 0;
    });

  // Filter and sort products alphabetically
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === null || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-stone-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search Bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-stone-800">
        <div className="flex gap-3">
          <div data-tour="search" className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <button
            onClick={onCustomItemClick}
            className="px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Custom</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div data-tour="categories" className="pl-4 sm:pl-6 py-4 border-b border-stone-800 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pr-4 sm:pr-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              selectedCategory === null
                ? 'bg-emerald-500 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === category
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Favorites Row */}
      {favoriteProducts.length > 0 && (
        <div className="pl-4 sm:pl-6 py-3 border-b border-stone-800 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pr-4 sm:pr-6">
            {favoriteProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => onProductClick(product)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full hover:bg-amber-500/20 transition-all shrink-0"
                >
                  <span className="text-sm font-medium text-stone-200 whitespace-nowrap">
                    {product.name}
                  </span>
                  <span className="text-xs text-amber-400 font-medium">
                    {formatPrice(product.price, product.unit)}
                  </span>
                </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div onScroll={handleScroll} data-tour="products" className="flex-1 overflow-y-auto p-4 sm:p-6 pb-40">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-stone-700 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-stone-500 mb-4">No products found</p>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onCustomItemClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full font-medium text-sm hover:bg-emerald-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Custom Item
              </button>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 font-medium text-sm hover:text-stone-300 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={onProductClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
