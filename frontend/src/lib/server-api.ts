/**
 * Server-side API calls
 * These functions run ONLY on the server, never exposed to client
 */

import axios from 'axios';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Create axios instance for server-side calls
const serverApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get client IP from request headers (for rate limiting)
 * This ensures each user is rate-limited individually, not the server as a whole
 */
export function getClientIp(): string {
  try {
    const headersList = headers();
    return (
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      headersList.get('cf-connecting-ip') || // Cloudflare
      'server-internal'
    );
  } catch {
    return 'server-internal';
  }
}

/**
 * Get headers with client IP forwarded for proper rate limiting
 */
function getForwardedHeaders(): Record<string, string> {
  const ip = getClientIp();
  return {
    'X-Forwarded-For': ip,
    'X-Real-IP': ip,
  };
}

/**
 * Server-side API functions
 * Direct calls to backend, no encryption needed
 * All functions forward the real client IP for proper rate limiting
 */

export const serverMarketplaceApi = {
  /**
   * Get featured products (server-side only)
   */
  async getFeaturedProducts() {
    try {
      const response = await serverApi.get('/products/featured', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getFeaturedProducts:', error.message);
      return [];
    }
  },

  async getBestSellersWeekly() {
    try {
      const response = await serverApi.get('/products/best-sellers-weekly', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getBestSellersWeekly:', error.message);
      return [];
    }
  },

  async getTrustedShopProducts() {
    try {
      const response = await serverApi.get('/products/trusted-shops', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getTrustedShopProducts:', error.message);
      return [];
    }
  },

  /**
   * Get latest products (server-side only)
   */
  async getLatestProducts() {
    try {
      const response = await serverApi.get('/products/latest', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getLatestProducts:', error.message);
      return [];
    }
  },

  /**
   * Get all categories (server-side only)
   * @param onlyParent - If true, only return parent categories (for homepage)
   */
  async getCategories(onlyParent: boolean = false) {
    try {
      const url = onlyParent ? '/categories?parent=true' : '/categories';
      const response = await serverApi.get(url, {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getCategories:', error.message);
      return [];
    }
  },

  /**
   * Get products with filters (server-side only)
   */
  async getProducts(params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }) {
    try {
      const response = await serverApi.get('/products', {
        params,
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getProducts:', error.message);
      return { products: [], total: 0, page: 1, totalPages: 0 };
    }
  },

  /**
   * Get single product (server-side only)
   */
  async getProduct(id: string) {
    try {
      const response = await serverApi.get(`/products/${id}`, {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getProduct:', error.message);
      return null;
    }
  },

  /**
   * Get category by slug (server-side only)
   */
  async getCategoryBySlug(slug: string) {
    try {
      const response = await serverApi.get(`/categories/slug/${slug}`, {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getCategoryBySlug:', error.message);
      return null;
    }
  },

  /**
   * Get active banners (server-side only)
   */
  async getBanners() {
    try {
      const response = await serverApi.get('/public/banners', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getBanners:', error.message);
      return [];
    }
  },

  /**
   * Get shop profile (server-side only)
   */
  async getShopProfile(id: string) {
    try {
      const response = await serverApi.get(`/shop/${id}`, {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getShopProfile:', error.message);
      return null;
    }
  },

  /**
   * Get shop products (server-side only)
   */
  async getShopProducts(id: string, params?: { page?: number; limit?: number; sort?: string }) {
    try {
      const response = await serverApi.get(`/shop/${id}/products`, {
        params,
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getShopProducts:', error.message);
      return { products: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
    }
  },

  /**
   * Get auction winners (server-side only)
   */
  async getAuctionWinners() {
    try {
      const response = await serverApi.get('/auction/winners', {
        headers: getForwardedHeaders(),
      });
      return response.data.winners || [];
    } catch (error: any) {
      console.error('[Server API Error] getAuctionWinners:', error.message);
      return [];
    }
  },

  /**
   * Get active category showcases (server-side only)
   */
  async getCategoryShowcases() {
    try {
      const response = await serverApi.get('/public/category-showcases', {
        headers: getForwardedHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error('[Server API Error] getCategoryShowcases:', error.message);
      return [];
    }
  },
};
