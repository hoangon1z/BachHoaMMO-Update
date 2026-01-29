import { apiUrl } from './config';

export interface AdminConversationStats {
  total: number;
  buyerSeller: number;
  support: number;
  disputed: number;
  pendingDisputes: number;
}

export interface AdminSearchResult {
  messages: any[];
  total: number;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const chatAdminApi = {
  async listConversations(params?: { status?: string; type?: string; search?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));

    const res = await fetch(apiUrl(`/chat/admin/conversations?${qs.toString()}`), {
      headers: {
        ...authHeaders(),
      },
    });
    return res;
  },

  async searchMessages(params: { q: string; conversationId?: string; userId?: string; page?: number; limit?: number }) {
    const qs = new URLSearchParams();
    qs.set('q', params.q);
    if (params.conversationId) qs.set('conversationId', params.conversationId);
    if (params.userId) qs.set('userId', params.userId);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));

    const res = await fetch(apiUrl(`/chat/admin/search?${qs.toString()}`), {
      headers: {
        ...authHeaders(),
      },
    });
    return res;
  },
};
