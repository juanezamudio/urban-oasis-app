import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favoriteIds: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearFavorites: () => void;
}

const MAX_FAVORITES = 10;

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      toggleFavorite: (productId: string) => {
        const { favoriteIds } = get();
        const isFavorited = favoriteIds.includes(productId);

        if (isFavorited) {
          // Remove from favorites
          set({ favoriteIds: favoriteIds.filter((id) => id !== productId) });
        } else {
          // Add to favorites (with max limit)
          if (favoriteIds.length < MAX_FAVORITES) {
            set({ favoriteIds: [productId, ...favoriteIds] });
          }
        }
      },

      isFavorite: (productId: string) => {
        return get().favoriteIds.includes(productId);
      },

      clearFavorites: () => {
        set({ favoriteIds: [] });
      },
    }),
    {
      name: 'uop-favorites',
    }
  )
);
