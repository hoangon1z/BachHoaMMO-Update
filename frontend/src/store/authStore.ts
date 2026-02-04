import { create } from 'zustand';
import { api } from '@/lib/api';
import { getObfuscatedUrl } from '@/lib/endpoint-mapping';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  role?: string;
  isSeller?: boolean;
  balance?: number;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to transform avatar URL to include backend URL
const transformAvatarUrl = (avatar: string | undefined): string | undefined => {
  if (!avatar) return undefined;
  if (avatar.startsWith('http')) return avatar;
  // Use NEXT_PUBLIC_SOCKET_URL which points directly to backend
  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  return `${backendUrl}${avatar}`;
};

// Transform user data to include full avatar URL
const transformUserData = (user: any): User => ({
  ...user,
  avatar: transformAvatarUrl(user.avatar),
});

interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  message?: string;
  user?: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean; // Track if auth check is done
  error: string | null;
  pendingEmail: string | null; // For 2FA flow
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (code: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>; // Refresh user data (including balance)
  updateBalance: (newBalance: number) => void; // Update balance locally
  updateUser: (userData: Partial<User>) => void; // Update user data locally
  clearPendingEmail: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false, // Start as false
  error: null,
  pendingEmail: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = getObfuscatedUrl('auth.login');
      const response = await api.post(url, { email, password });
      
      // Check if 2FA is required
      if (response.data.requires2FA) {
        set({ pendingEmail: email, isLoading: false });
        // Store email in localStorage as backup in case state is lost
        localStorage.setItem('pending2FAEmail', email);
        return { success: false, requires2FA: true, message: response.data.message };
      }
      
      const { access_token, user } = response.data;
      const transformedUser = transformUserData(user);
      
      localStorage.setItem('token', access_token);
      set({ user: transformedUser, token: access_token, isLoading: false, pendingEmail: null });
      return { success: true, user: transformedUser };
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  verify2FA: async (code: string) => {
    // Get email from state or localStorage backup
    let email = get().pendingEmail;
    if (!email) {
      email = localStorage.getItem('pending2FAEmail');
    }
    if (!email) {
      throw new Error('Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    set({ isLoading: true, error: null });
    try {
      const url = getObfuscatedUrl('auth.2fa.verify');
      const response = await api.post(url, { email, code });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.removeItem('pending2FAEmail'); // Clean up
      set({ user: transformUserData(user), token: access_token, isLoading: false, pendingEmail: null });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || '2FA verification failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearPendingEmail: () => {
    localStorage.removeItem('pending2FAEmail');
    set({ pendingEmail: null });
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = getObfuscatedUrl('auth.register');
      const response = await api.post(url, { email, password, name });
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      set({ user: transformUserData(user), token: access_token, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Registration failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    // If already initialized and has user, don't check again
    const state = get();
    if (state.isInitialized && state.user) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isInitialized: true });
      return;
    }

    try {
      const url = getObfuscatedUrl('auth.me');
      const response = await api.get(url);
      set({ user: transformUserData(response.data), token, isInitialized: true });
    } catch (error: any) {
      // Only clear token if it's an authentication error (401/403)
      // Don't clear on network errors or other issues
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        set({ user: null, token: null, isInitialized: true });
      } else {
        // For other errors (network, 500, etc.), keep the token and try again later
        console.error('Auth check failed:', error.message);
        set({ isInitialized: true });
      }
    }
  },

  // Refresh user data from server (to get updated balance, etc.)
  refreshUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const url = getObfuscatedUrl('auth.me');
      const response = await api.get(url);
      set({ user: transformUserData(response.data) });
    } catch (error) {
      // Silently fail - don't logout on refresh error
      console.error('Failed to refresh user data');
    }
  },

  // Update balance locally (for immediate UI update)
  updateBalance: (newBalance: number) => {
    const state = get();
    if (state.user) {
      set({ user: { ...state.user, balance: newBalance } });
    }
  },

  // Update user data locally (for immediate UI update after profile changes)
  updateUser: (userData: Partial<User>) => {
    const state = get();
    if (state.user) {
      set({ user: { ...state.user, ...userData } });
    }
  },
}));
