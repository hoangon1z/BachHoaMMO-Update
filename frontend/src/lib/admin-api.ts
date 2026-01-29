/**
 * Admin API Helper
 * All admin API calls go through the Next.js proxy to avoid CORS issues
 */

const API_BASE = '/api';

/**
 * Make authenticated admin API request
 */
export async function adminFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = endpoint.startsWith('/') 
    ? `${API_BASE}${endpoint}` 
    : `${API_BASE}/${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Admin API endpoints
 */
export const adminApi = {
  // Dashboard
  getDashboard: () => adminFetch('/admin/dashboard'),

  // Users
  getUsers: (params?: string) => adminFetch(`/admin/users${params ? `?${params}` : ''}`),
  getUser: (id: string) => adminFetch(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => adminFetch(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  resetPassword: (id: string) => adminFetch(`/admin/users/${id}/reset-password`, {
    method: 'POST',
  }),

  // Categories
  getCategories: () => adminFetch('/admin/categories'),
  createCategory: (data: any) => adminFetch('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCategory: (id: string, data: any) => adminFetch(`/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCategory: (id: string) => adminFetch(`/admin/categories/${id}`, {
    method: 'DELETE',
  }),

  // Banners
  getBanners: () => adminFetch('/admin/banners'),
  createBanner: (data: any) => adminFetch('/admin/banners', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBanner: (id: string, data: any) => adminFetch(`/admin/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteBanner: (id: string) => adminFetch(`/admin/banners/${id}`, {
    method: 'DELETE',
  }),

  // Products
  getProducts: (params?: string) => adminFetch(`/admin/products${params ? `?${params}` : ''}`),
  updateProductStatus: (id: string, status: string) => adminFetch(`/admin/products/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  deleteProduct: (id: string) => adminFetch(`/admin/products/${id}`, {
    method: 'DELETE',
  }),

  // Orders
  getOrders: (params?: string) => adminFetch(`/admin/orders${params ? `?${params}` : ''}`),

  // Sellers
  getSellers: (params?: string) => adminFetch(`/admin/sellers${params ? `?${params}` : ''}`),
  updateSellerStatus: (id: string, status: string) => adminFetch(`/admin/sellers/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),

  // Transactions
  getTransactions: (params?: string) => adminFetch(`/admin/transactions${params ? `?${params}` : ''}`),

  // Recharges
  getPendingRecharges: () => adminFetch('/admin/recharges/pending'),
  approveRecharge: (id: string) => adminFetch(`/admin/recharges/${id}/approve`, {
    method: 'POST',
  }),
  rejectRecharge: (id: string) => adminFetch(`/admin/recharges/${id}/reject`, {
    method: 'POST',
  }),

  // Escrows
  getEscrows: (status?: string) => adminFetch(`/admin/escrows${status ? `?status=${status}` : ''}`),
  releaseEscrow: (id: string) => adminFetch(`/admin/escrows/${id}/release`, {
    method: 'POST',
  }),
};
