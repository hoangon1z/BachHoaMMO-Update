import { api } from './api';
import { getObfuscatedUrl } from './endpoint-mapping';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  _count?: {
    products: number;
  };
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  images: string;
  stock: number;
  status: string;
  views: number;
  sales: number;
  rating: number;
  category: Category;
  seller: {
    id: string;
    name: string;
    email: string;
    sellerProfile?: {
      shopName: string;
      rating: number;
      totalSales: number;
      isVerified: boolean;
      insuranceLevel?: number;
      insuranceTier?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export const marketplaceApi = {
  // Categories
  async getCategories(): Promise<Category[]> {
    const url = getObfuscatedUrl('categories.list');
    const response = await api.get(url);
    return response.data;
  },

  async getCategory(id: string): Promise<Category> {
    const url = getObfuscatedUrl('categories.get', { id });
    const response = await api.get(url);
    return response.data;
  },

  async getCategoryBySlug(slug: string): Promise<Category> {
    const url = getObfuscatedUrl('categories.slug', { slug });
    const response = await api.get(url);
    return response.data;
  },

  // Products
  async getProducts(params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
  }): Promise<ProductsResponse> {
    const url = getObfuscatedUrl('products.list', params);
    const response = await api.get(url);
    return response.data;
  },

  async getProduct(id: string): Promise<Product> {
    const url = getObfuscatedUrl('products.get', { id });
    const response = await api.get(url);
    return response.data;
  },

  async getFeaturedProducts(): Promise<Product[]> {
    const url = getObfuscatedUrl('products.featured');
    const response = await api.get(url);
    return response.data;
  },

  async getLatestProducts(): Promise<Product[]> {
    const url = getObfuscatedUrl('products.latest');
    const response = await api.get(url);
    return response.data;
  },

  async createProduct(data: {
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    stock: number;
    images: string;
    categoryId: string;
  }): Promise<Product> {
    const url = getObfuscatedUrl('products.create');
    const response = await api.post(url, data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const url = getObfuscatedUrl('products.update', { id });
    const response = await api.put(url, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    const url = getObfuscatedUrl('products.delete', { id });
    await api.delete(url);
  },

  // Payment (PayOS)
  async createPayment(data: { amount: number; returnUrl: string; cancelUrl: string }): Promise<{
    success: boolean;
    data?: {
      checkoutUrl: string;
      qrCode: string;
      accountNumber: string;
      accountName: string;
      amount: number;
      description: string;
      orderCode: number;
      transactionId: string;
    };
    message?: string;
  }> {
    const url = getObfuscatedUrl('payment.create');
    const response = await api.post(url, data);
    return response.data;
  },

  async checkPaymentStatus(orderCode: string | number): Promise<any> {
    const url = getObfuscatedUrl('payment.status', { orderCode: String(orderCode) });
    const response = await api.get(url);
    return response.data;
  },

  async checkAndApprovePayment(orderCode: string | number): Promise<{
    success: boolean;
    message: string;
    paymentStatus?: string;
    amount?: number;
  }> {
    const url = getObfuscatedUrl('payment.check', { orderCode: String(orderCode) });
    const response = await api.post(url);
    return response.data;
  },

  async getPaymentConfig(): Promise<{ configured: boolean; message: string }> {
    const url = getObfuscatedUrl('payment.config');
    const response = await api.get(url);
    return response.data;
  },

  // Wallet
  async getWalletBalance(userId: string): Promise<{ balance: number; pendingBalance: number }> {
    const url = getObfuscatedUrl('wallet.balance', { userId });
    const response = await api.get(url);
    return response.data;
  },

  async getWalletTransactions(userId: string): Promise<{ transactions: Transaction[] }> {
    const url = getObfuscatedUrl('wallet.transactions', { userId });
    const response = await api.get(url);
    return response.data;
  },
};

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND' | 'EARNING';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  description: string;
  createdAt: string;
  orderId?: string;
}
