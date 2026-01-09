import { useState } from 'react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { cn } from '../lib/utils';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  isLoading?: boolean;
}

export function ProductGrid({ products, onProductClick, isLoading }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === null || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-950">
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
        <div className="relative">
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
      </div>

      {/* Category Filter */}
      <div className="px-4 sm:px-6 py-4 border-b border-stone-800">
        <div className="flex flex-wrap gap-2 sm:gap-3">
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

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
            <p className="text-stone-500">No products found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-emerald-400 font-medium text-sm mt-2 hover:text-emerald-300 transition-colors"
              >
                Clear search
              </button>
            )}
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
