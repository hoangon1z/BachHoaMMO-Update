'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ConversationList, ChatWindow } from '@/components/chat';
import { Conversation, useChat } from '@/hooks/useChat';
import { 
  MessageCircle, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter,
  Eye,
  Shield,
  Gavel
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';

function AdminMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checkAuth, isInitialized } = useAuthStore();
  
  // Single useChat instance for entire page
  const chatHook = useChat();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ messages: any[]; total: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    buyerSeller: 0,
    support: 0,
    disputed: 0,
    pendingDisputes: 0,
  });

  const conversationIdFromUrl = searchParams.get('id');

  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  useEffect(() => {
    const run = async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults(null);
        return;
      }

      setIsSearching(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/chat/admin/search?q=${encodeURIComponent(q)}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setSearchResults({ messages: data.messages || [], total: data.total || 0 });
        } else {
          setSearchResults({ messages: [], total: 0 });
        }
      } catch (error) {
        console.error('Search messages error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const t = setTimeout(run, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/login');
    }
  }, [user, isInitialized]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/admin/conversations?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) return;

      const conversations: Conversation[] = data.conversations || [];

      const total = conversations.length;
      const buyerSeller = conversations.filter(c => c.type === 'BUYER_SELLER').length;
      const support = conversations.filter(c => c.type === 'BUYER_ADMIN' || c.type === 'SELLER_ADMIN').length;
      const disputed = conversations.filter(c => c.status === 'RESOLVED').length;
      const pendingDisputes = conversations.filter(c => c.status === 'DISPUTED').length;

      setStats({ total, buyerSeller, support, disputed, pendingDisputes });
    } catch (error) {
      console.error('Fetch chat stats error:', error);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    router.push(`/admin/messages?id=${conv._id}`, { scroll: false });
  };

  const handleJoinDispute = async () => {
    if (!selectedConversation) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/chat/conversations/${selectedConversation._id}/join-dispute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error('Join dispute error:', error);
    }
  };

  const handleResolveDispute = async (resolution: string) => {
    if (!selectedConversation) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/chat/conversations/${selectedConversation._id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolution }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error('Resolve dispute error:', error);
    }
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý tin nhắn</h1>
          <p className="text-muted-foreground">Giám sát và xử lý tranh chấp</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tin nhắn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Tổng cuộc trò chuyện</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.buyerSeller}</p>
              <p className="text-xs text-muted-foreground">Buyer ↔ Seller</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.support}</p>
              <p className="text-xs text-muted-foreground">Hỗ trợ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingDisputes}</p>
              <p className="text-xs text-muted-foreground">Chờ xử lý</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.disputed}</p>
              <p className="text-xs text-muted-foreground">Đã giải quyết</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-[calc(100vh-400px)] min-h-[400px]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Tất cả cuộc trò chuyện
              </h2>
            </div>

            {/* Filters */}
            <div className="p-3 border-b flex gap-2 overflow-x-auto">
              <Button
                variant={!filter.status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({})}
              >
                Tất cả
              </Button>
              <Button
                variant={filter.status === 'DISPUTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ status: 'DISPUTED' })}
                className="text-yellow-600"
              >
                🔥 Tranh chấp
              </Button>
              <Button
                variant={filter.type === 'BUYER_ADMIN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ type: 'BUYER_ADMIN' })}
              >
                Hỗ trợ
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim() && (
                <div className="p-3 border-b bg-gray-50">
                  <p className="text-xs text-gray-600">
                    {isSearching ? 'Đang tìm kiếm...' : `Kết quả: ${searchResults?.total ?? 0} tin nhắn`}
                  </p>
                  {(searchResults?.messages?.length || 0) > 0 && (
                    <div className="mt-2 space-y-2">
                      {searchResults!.messages.slice(0, 5).map((m: any) => (
                        <button
                          key={m._id}
                          onClick={() => {
                            setSearchQuery('');
                            router.push(`/admin/messages?id=${m.conversationId}`, { scroll: false });
                          }}
                          className="w-full text-left p-2 rounded-lg bg-white border hover:bg-blue-50"
                        >
                          <p className="text-xs text-gray-500 truncate">Conversation: {String(m.conversationId)}</p>
                          <p className="text-sm text-gray-800 truncate">{m.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedId={selectedConversation?._id}
                filter={filter}
                chatHook={chatHook}
              />
            </div>
          </div>

          {/* Chat Window */}
          <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation || conversationIdFromUrl ? (
              <>
                {/* Admin Actions Bar */}
                {selectedConversation?.status === 'DISPUTED' && (
                  <div className="p-3 border-b bg-yellow-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Tranh chấp cần xử lý</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedConversation.adminId && (
                        <Button size="sm" onClick={handleJoinDispute}>
                          <Gavel className="w-4 h-4 mr-1" />
                          Tham gia xử lý
                        </Button>
                      )}
                      {selectedConversation.adminId === user.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const resolution = prompt('Nhập kết quả giải quyết:');
                            if (resolution) handleResolveDispute(resolution);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Đánh dấu đã xử lý
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="md:hidden p-3 border-b">
                  <Button variant="ghost" size="sm" onClick={() => setShowMobileChat(false)}>
                    ← Quay lại
                  </Button>
                </div>
                <ChatWindow
                  conversationId={selectedConversation?._id || conversationIdFromUrl || undefined}
                  chatHook={chatHook}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Eye className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Chọn cuộc trò chuyện để xem
                </h3>
                <p className="text-gray-500">
                  Bạn có thể xem và can thiệp vào bất kỳ cuộc trò chuyện nào
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminMessagesContent />
    </Suspense>
  );
}
