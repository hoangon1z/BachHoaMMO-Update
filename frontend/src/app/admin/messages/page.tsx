'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation, useChat } from '@/hooks/useChat';
import {
  MessageCircle, Users, AlertTriangle, CheckCircle, Search, Eye, Shield,
  Gavel, ArrowLeft, X, User, Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import { API_BASE_URL } from '@/lib/config';

function AdminMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, checkAuth, isInitialized } = useAuthStore();

  const chatHook = useChat();
  const { conversations, loadConversations, loadConversation, loadMessages, isLoading, currentConversation } = chatHook;

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ messages: any[]; total: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({ total: 0, buyerSeller: 0, support: 0, disputed: 0, pendingDisputes: 0 });
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const conversationIdFromUrl = searchParams.get('id');

  useEffect(() => { checkAuth(); }, []);

  // Fetch stats using dedicated endpoint
  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chat/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setStats({
            total: data.total,
            buyerSeller: 0,
            support: 0,
            disputed: data.resolved,
            pendingDisputes: data.disputed,
          });
        }
      } catch (error) { console.error('Fetch chat stats error:', error); }
    };
    fetchStats();
  }, [token]);

  // Load conversations
  useEffect(() => {
    if (!token || !user) return;
    loadConversations(filter as any);
  }, [filter, token, user]);

  // Search messages
  useEffect(() => {
    const run = async () => {
      const q = searchQuery.trim();
      if (!q) { setSearchResults(null); return; }
      setIsSearching(true);
      try {
        const response = await fetch(`${API_BASE_URL}/chat/admin/search?q=${encodeURIComponent(q)}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setSearchResults({ messages: data.messages || [], total: data.total || 0 });
        else setSearchResults({ messages: [], total: 0 });
      } catch (error) { console.error('Search messages error:', error); }
      finally { setIsSearching(false); }
    };
    const t = setTimeout(run, 350);
    return () => clearTimeout(t);
  }, [searchQuery, token]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || user.role !== 'ADMIN') router.push('/login');
  }, [user, isInitialized]);

  // Load conversation from URL
  useEffect(() => {
    if (conversationIdFromUrl && !selectedConversation) {
      const found = conversations.find(c => c._id === conversationIdFromUrl);
      if (found) {
        setSelectedConversation(found);
        setShowMobileChat(true);
      }
    }
  }, [conversationIdFromUrl, conversations, selectedConversation]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    loadConversation(conv._id);
    loadMessages(conv._id);
    router.push(`/admin/messages?id=${conv._id}`, { scroll: false });
  }, [router, loadConversation, loadMessages]);

  const handleJoinDispute = async () => {
    if (!selectedConversation || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${selectedConversation._id}/join-dispute`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setSelectedConversation(data.conversation);
    } catch (error) { console.error('Join dispute error:', error); }
  };

  const handleResolveDispute = async () => {
    if (!selectedConversation || !resolution.trim() || !token) return;
    setIsResolving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${selectedConversation._id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resolution: resolution.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedConversation(data.conversation);
        setShowResolveModal(false);
        setResolution('');
      }
    } catch (error) { console.error('Resolve dispute error:', error); }
    finally { setIsResolving(false); }
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const FILTERS = [
    { key: '', label: 'Tất cả', count: stats.total },
    { key: 'DISPUTED', label: '🔥 Tranh chấp', count: stats.pendingDisputes, color: 'text-yellow-600' },
    { key: 'BUYER_ADMIN', label: 'Hỗ trợ', count: stats.support, isType: true },
    { key: 'BUYER_SELLER', label: 'Buyer ↔ Seller', count: stats.buyerSeller, isType: true },
    { key: 'RESOLVED', label: '✓ Đã xử lý', count: stats.disputed },
  ];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-500" />
            Tin nhắn
          </h1>
          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <MessageCircle className="w-3 h-3" /> {stats.total}
            </span>
            {stats.pendingDisputes > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-medium animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {stats.pendingDisputes} tranh chấp
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <CheckCircle className="w-3 h-3" /> {stats.disputed} đã xử lý
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-xl border overflow-hidden flex-1 min-h-0">
        <div className="flex h-full">
          {/* Conversation Sidebar */}
          <div className={`w-full md:w-80 lg:w-[340px] border-r flex flex-col flex-shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Admin Search */}
            <div className="p-3 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tin nhắn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="px-2 py-2 border-b flex gap-1 overflow-x-auto flex-shrink-0">
              {FILTERS.map((f) => {
                const isActive = f.isType
                  ? filter.type === f.key
                  : (f.key === '' ? !filter.status && !filter.type : filter.status === f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => f.isType ? setFilter({ type: f.key }) : setFilter(f.key ? { status: f.key } : {})}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors
                      ${isActive ? 'bg-amber-500 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {f.label}
                    {f.count > 0 && (
                      <span className={`ml-1 ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{f.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search results overlay */}
            {searchQuery.trim() && (
              <div className="p-3 border-b bg-amber-50/50 flex-shrink-0">
                <p className="text-[11px] text-gray-600 font-medium mb-2">
                  {isSearching ? '⏳ Đang tìm...' : `${searchResults?.total ?? 0} kết quả`}
                </p>
                {(searchResults?.messages?.length || 0) > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {searchResults!.messages.slice(0, 5).map((m: any) => (
                      <button
                        key={m._id}
                        onClick={() => {
                          setSearchQuery('');
                          router.push(`/admin/messages?id=${m.conversationId}`, { scroll: false });
                        }}
                        className="w-full text-left p-2 rounded-lg bg-white border border-gray-100 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
                      >
                        <p className="text-[11px] text-gray-400 truncate">
                          {m.senderName || 'Unknown'} • {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                        <p className="text-[13px] text-gray-800 truncate">{m.content}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?._id}
                onSelect={handleSelectConversation}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col min-w-0 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation || conversationIdFromUrl ? (
              <>
                {/* Admin chat header with participant info */}
                <div className="px-4 py-3 border-b bg-white flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedConversation?.buyerId && (
                        <div className="flex items-center gap-1">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-[11px] text-gray-600">Buyer</span>
                        </div>
                      )}
                      {selectedConversation?.buyerId && selectedConversation?.sellerId && (
                        <span className="text-gray-300 text-xs">↔</span>
                      )}
                      {selectedConversation?.sellerId && (
                        <div className="flex items-center gap-1">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                            <Store className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-[11px] text-gray-600">Seller</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">
                        {selectedConversation?.subject || 'Cuộc trò chuyện'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${selectedConversation?.status === 'DISPUTED' ? 'bg-yellow-100 text-yellow-700' :
                            selectedConversation?.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                              selectedConversation?.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-500' :
                                'bg-blue-100 text-blue-700'
                          }`}>
                          {selectedConversation?.status}
                        </span>
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> Admin View
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispute action bar */}
                {selectedConversation?.status === 'DISPUTED' && (
                  <div className="px-4 py-2.5 border-b bg-yellow-50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-4 h-4" />
                      <div>
                        <span className="text-[13px] font-semibold">Tranh chấp cần xử lý</span>
                        {selectedConversation.disputeReason && (
                          <p className="text-[11px] text-yellow-600">Lý do: {selectedConversation.disputeReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedConversation.adminId && (
                        <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-gray-900" onClick={handleJoinDispute}>
                          <Gavel className="w-3.5 h-3.5 mr-1" /> Tham gia
                        </Button>
                      )}
                      {selectedConversation.adminId === user.id && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setShowResolveModal(true)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Đã xử lý
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <ChatWindow
                  conversationId={selectedConversation?._id || conversationIdFromUrl || undefined}
                  chatHook={chatHook}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Eye className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-700 mb-1">
                  Giám sát cuộc trò chuyện
                </h3>
                <p className="text-[13px] text-gray-400 max-w-xs">
                  Chọn một cuộc trò chuyện từ danh sách bên trái để xem nội dung và can thiệp khi cần
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Dispute Modal (replaces prompt()) */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Gavel className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Giải quyết tranh chấp</h3>
                    <p className="text-xs text-gray-500">Nhập kết quả giải quyết để thông báo cho các bên</p>
                  </div>
                </div>
                <button onClick={() => { setShowResolveModal(false); setResolution(''); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Dispute info */}
              {selectedConversation?.disputeReason && (
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                  <p className="text-[11px] text-yellow-600 font-medium mb-0.5">Lý do tranh chấp:</p>
                  <p className="text-sm text-yellow-800">{selectedConversation.disputeReason}</p>
                </div>
              )}

              {/* Resolution input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kết quả giải quyết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Mô tả kết quả giải quyết tranh chấp..."
                  className="w-full min-h-[120px] px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{resolution.length}/500</p>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700">
                  💡 Kết quả sẽ được gửi dưới dạng tin nhắn hệ thống cho tất cả các bên trong cuộc trò chuyện.
                  Cả buyer và seller đều phải xác nhận hoàn tất để đóng cuộc hội thoại.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowResolveModal(false); setResolution(''); }} disabled={isResolving}>
                Hủy
              </Button>
              <Button
                onClick={handleResolveDispute}
                disabled={!resolution.trim() || isResolving}
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 min-w-[120px]"
              >
                {isResolving ? (
                  <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" /> Đang xử lý...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Xác nhận</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminMessagesContent />
    </Suspense>
  );
}
