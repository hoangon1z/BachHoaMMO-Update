import { create } from 'zustand';
import { marketplaceApi, Category, Product } from '@/lib/marketplace-api';

interface MarketplaceState {
  categories: Category[];
  featuredProducts: Product[];
  latestProducts: Product[];
  isLoading: boolean;
  error: string | null;
  
  fetchCategories: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchLatestProducts: () => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  categories: [],
  featuredProducts: [],
  latestProducts: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await marketplaceApi.getCategories();
      set({ categories, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch categories', 
        isLoading: false 
      });
    }
  },

  fetchFeaturedProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await marketplaceApi.getFeaturedProducts();
      set({ featuredProducts: products, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch products', 
        isLoading: false 
      });
    }
  },

  fetchLatestProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await marketplaceApi.getLatestProducts();
      set({ latestProducts: products, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch products', 
        isLoading: false 
      });
    }
  },
}));
