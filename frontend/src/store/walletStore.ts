import { create } from 'zustand';
import { authFetch } from '@/lib/config';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND' | 'EARNING';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  description: string;
  createdAt: string;
  orderId?: string;
}

interface WalletState {
  balance: number;
  pendingBalance: number; // For sellers - money in escrow
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchBalance: (userId?: string) => Promise<void>;
  fetchTransactions: (userId?: string) => Promise<void>;
  createRechargeRequest: (amount: number) => Promise<void>;
  setBalance: (balance: number) => void;
}

// Helper to get userId from localStorage
const getUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch {}
  return null;
};

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  pendingBalance: 0,
  transactions: [],
  isLoading: false,
  error: null,

  fetchBalance: async (userId?: string) => {
    const uid = userId || getUserId();
    if (!uid) {
      console.error('No user ID available');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await authFetch(`/wallet/balance/${uid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      set({ 
        balance: data.balance || 0, 
        pendingBalance: data.pendingBalance || 0, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Fetch balance error:', error);
      set({ error: error.message, isLoading: false, balance: 0, pendingBalance: 0 });
    }
  },

  fetchTransactions: async (userId?: string) => {
    const uid = userId || getUserId();
    if (!uid) {
      console.error('No user ID available');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await authFetch(`/wallet/transactions/${uid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      set({ transactions: data.transactions || [], isLoading: false });
    } catch (error: any) {
      console.error('Fetch transactions error:', error);
      set({ error: error.message, isLoading: false, transactions: [] });
    }
  },

  createRechargeRequest: async (amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authFetch('/wallet/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      
      if (!response.ok) throw new Error('Failed to create recharge request');
      
      const data = await response.json();
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      console.error('Create recharge error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setBalance: (balance: number) => {
    set({ balance });
  },
}));
