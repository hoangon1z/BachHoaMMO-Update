'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { useAuthStore } from '@/store/authStore';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { AdminContactDialog } from '@/components/chat/AdminContactDialog';
import { Conversation } from '@/hooks/useChat';
import { useChat } from '@/hooks/useChat';
import { MessageCircle, Shield, Store, Package, ExternalLink, ArrowLeft, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { API_BASE_URL } from '@/lib/config';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, logout, checkAuth, isInitialized } = useAuthStore();

  const chatHook = useChat();
  const { conversations, loadConversations, loadConversation, loadMessages, startConversationWithSeller, isLoading } = chatHook;

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const [chatOrderInfo, setChatOrderInfo] = useState<any>(null);
  const [chatSellerInfo, setChatSellerInfo] = useState<any>(null);

  const conversationIdFromUrl = searchParams.get('id');
  const sellerIdFromUrl = searchParams.get('seller');
  const sellerNameFromUrl = searchParams.get('sellerName');

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) router.push('/login?redirect=/messages');
  }, [user, isInitialized]);

  // Load conversations
  useEffect(() => {
    if (!token || !user) return;
    loadConversations(filter as any);
  }, [filter, token, user]);

  // Match conversation from URL
  useEffect(() => {
    if (!user || !conversationIdFromUrl) return;
    setShowMobileChat(true);
    const conv = conversations.find(c => c._id === conversationIdFromUrl);
    if (conv) setSelectedConversation(conv);
  }, [user, conversationIdFromUrl, conversations]);

  // Fetch seller/order info for chat header
  useEffect(() => {
    const fetchChatInfo = async () => {
      if (!selectedConversation && !conversationIdFromUrl) {
        setChatOrderInfo(null); setChatSellerInfo(null); return;
      }
      const conv = selectedConversation || conversations.find(c => c._id === conversationIdFromUrl);
      if (!conv) return;

      if (conv.sellerId && conv.sellerId !== user?.id) {
        try {
          const res = await fetch(`${API_BASE_URL}/users/${conv.sellerId}/public-profile`);
          if (res.ok) setChatSellerInfo(await res.json());
        } catch { }
      } else { setChatSellerInfo(null); }

      if (conv.orderId) {
        try {
          const res = await fetch(`${API_BASE_URL}/orders/${conv.orderId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) setChatOrderInfo(await res.json());
        } catch { }
      } else { setChatOrderInfo(null); }
    };
    fetchChatInfo();
  }, [selectedConversation, conversationIdFromUrl, conversations, user, token]);

  // Auto-start chat with seller from URL
  useEffect(() => {
    if (!user || !sellerIdFromUrl || isStartingChat) return;
    const startSellerChat = async () => {
      setIsStartingChat(true);
      try {
        const conversation = await startConversationWithSeller(sellerIdFromUrl);
        if (conversation?._id) {
          setSelectedConversation(conversation);
          setShowMobileChat(true);
          router.replace(`/messages?id=${conversation._id}`, { scroll: false });
          loadConversations();
        }
      } catch (error) { console.error('[Messages] Failed:', error); }
      finally { setIsStartingChat(false); }
    };
    startSellerChat();
  }, [user, sellerIdFromUrl, startConversationWithSeller]);

  const handleLogout = () => { logout(); router.push('/'); };
  const handleSearch = (query: string) => router.push(`/explore?q=${encodeURIComponent(query)}`);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    loadConversation(conv._id);
    loadMessages(conv._id);
    router.push(`/messages?id=${conv._id}`, { scroll: false });
  }, [router, loadConversation, loadMessages]);

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const FILTERS = [
    { key: '', label: 'Tất cả' },
    { key: 'ACTIVE', label: 'Hoạt động' },
    { key: 'DISPUTED', label: 'Tranh chấp' },
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-80 lg:w-[340px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>

          {/* Sidebar header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            <h1 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-4.5 h-4.5 text-blue-600" />
              Tin nhắn
            </h1>
            <button
              onClick={() => setShowAdminDialog(true)}
              className="text-[12px] text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Liên hệ admin
            </button>
          </div>

          {/* Filters */}
          <div className="px-3 py-2 flex gap-1 border-b border-gray-50 flex-shrink-0">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key ? { status: f.key } : {})}
                className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors
                  ${(filter.status || '') === f.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversations */}
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

        {/* ── Chat Area ── */}
        <div className={`flex-1 flex flex-col bg-white min-w-0 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {isStartingChat ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-[13px] text-gray-500">Đang kết nối với {sellerNameFromUrl || 'shop'}...</p>
            </div>
          ) : selectedConversation || conversationIdFromUrl ? (
            <>
              {/* Chat header */}
              <div className="border-b border-gray-100 flex-shrink-0">
                {/* Mobile back + seller info */}
                <div className="h-12 sm:h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </button>

                  {chatSellerInfo && (
                    <>
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                          {chatSellerInfo.sellerProfile?.shopLogo ? (
                            <img src={chatSellerInfo.sellerProfile.shopLogo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {selectedConversation?.otherParticipant?.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {chatSellerInfo.sellerProfile?.shopName || chatSellerInfo.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">Seller</span>
                          <span className={`text-[11px] ${selectedConversation?.otherParticipant?.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                            {selectedConversation?.otherParticipant?.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/shop/${chatSellerInfo.id}`}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1 transition-colors flex-shrink-0"
                      >
                        <Store className="w-3 h-3" /> Shop
                      </Link>
                    </>
                  )}

                  {!chatSellerInfo && selectedConversation?.otherParticipant && (
                    <>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center ring-2 ring-white flex-shrink-0">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {selectedConversation.otherParticipant.name || 'Hỗ trợ'}
                        </p>
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">Admin</span>
                      </div>
                    </>
                  )}

                  {!chatSellerInfo && !selectedConversation?.otherParticipant && (
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {selectedConversation?.subject || 'Cuộc trò chuyện'}
                    </p>
                  )}
                </div>

                {/* Order info — compact */}
                {chatOrderInfo && (
                  <Link
                    href={`/orders/${chatOrderInfo.id}`}
                    className="flex items-center gap-2 mx-3 mb-2 px-2.5 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {chatOrderInfo.items?.[0]?.product?.images && (
                      <img
                        src={JSON.parse(chatOrderInfo.items[0].product.images)[0]}
                        alt="" className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-700 font-medium truncate">
                        {chatOrderInfo.items?.map((i: any) => i.product?.title).join(', ')}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Intl.NumberFormat('vi-VN').format(chatOrderInfo.total)}đ · {chatOrderInfo.orderNumber}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  </Link>
                )}
              </div>

              <ChatWindow
                conversationId={selectedConversation?._id || conversationIdFromUrl || undefined}
                chatHook={chatHook}
              />
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
                <MessageCircle className="w-7 h-7 text-blue-300" />
              </div>
              <p className="text-[14px] font-medium text-gray-500 mb-1">Chọn cuộc trò chuyện</p>
              <p className="text-[12px] text-gray-400 max-w-[240px] text-center">
                Chọn từ danh sách bên trái hoặc bắt đầu trò chuyện mới với người bán
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Admin dialog */}
      <AdminContactDialog
        isOpen={showAdminDialog}
        onClose={() => { setShowAdminDialog(false); loadConversations(); }}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
