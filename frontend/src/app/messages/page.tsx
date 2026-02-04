'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { ConversationList, ChatWindow, AdminContactDialog } from '@/components/chat';
import { Conversation } from '@/hooks/useChat';
import { useChat } from '@/hooks/useChat';
import { MessageCircle, Filter, Search, Plus, Shield, Store, ExternalLink, Package, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth, isInitialized } = useAuthStore();
  
  // Single useChat instance for entire page
  const chatHook = useChat();
  const { startConversationWithAdmin, startConversationWithSeller } = chatHook;
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  
  // Order and seller info for chat header
  const [chatOrderInfo, setChatOrderInfo] = useState<any>(null);
  const [chatSellerInfo, setChatSellerInfo] = useState<any>(null);

  // Get params from URL
  const conversationIdFromUrl = searchParams.get('id');
  const sellerIdFromUrl = searchParams.get('seller');
  const sellerNameFromUrl = searchParams.get('sellerName');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login?redirect=/messages');
    }
  }, [user, isInitialized]);

  // Handle opening conversation from URL params (e.g., from order page complaint)
  useEffect(() => {
    if (!user || !conversationIdFromUrl) return;
    
    // Show mobile chat when conversation ID is in URL
    setShowMobileChat(true);
    
    // Find and set the conversation from loaded list
    const conv = chatHook.conversations.find(c => c._id === conversationIdFromUrl);
    if (conv) {
      setSelectedConversation(conv);
    }
  }, [user, conversationIdFromUrl, chatHook.conversations]);

  // Fetch order and seller info when conversation changes
  useEffect(() => {
    const fetchChatInfo = async () => {
      if (!selectedConversation && !conversationIdFromUrl) {
        setChatOrderInfo(null);
        setChatSellerInfo(null);
        return;
      }
      
      const conv = selectedConversation || chatHook.conversations.find(c => c._id === conversationIdFromUrl);
      if (!conv) return;
      
      const token = localStorage.getItem('token');
      
      // Fetch seller info
      if (conv.sellerId && conv.sellerId !== user?.id) {
        try {
          const res = await fetch(`/api/users/${conv.sellerId}/public-profile`);
          if (res.ok) {
            const data = await res.json();
            setChatSellerInfo(data);
          }
        } catch (error) {
          console.error('Failed to fetch seller info:', error);
        }
      } else {
        setChatSellerInfo(null);
      }
      
      // Fetch order info if conversation has orderId
      if (conv.orderId) {
        try {
          const res = await fetch(`/api/orders/${conv.orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setChatOrderInfo(data);
          }
        } catch (error) {
          console.error('Failed to fetch order info:', error);
        }
      } else {
        setChatOrderInfo(null);
      }
    };
    
    fetchChatInfo();
  }, [selectedConversation, conversationIdFromUrl, chatHook.conversations, user]);

  // Handle starting conversation with seller from URL params
  useEffect(() => {
    if (!user || !sellerIdFromUrl || isStartingChat) return;
    
    const startSellerChat = async () => {
      setIsStartingChat(true);
      try {
        console.log('[Messages] Starting chat with seller:', sellerIdFromUrl);
        const conversation = await startConversationWithSeller(sellerIdFromUrl);
        console.log('[Messages] Conversation created:', conversation);
        
        if (conversation?._id) {
          setSelectedConversation(conversation);
          setShowMobileChat(true);
          // Update URL to show conversation ID instead of seller params
          router.replace(`/messages?id=${conversation._id}`, { scroll: false });
          // Reload conversations list
          chatHook.loadConversations();
        }
      } catch (error) {
        console.error('[Messages] Failed to start chat with seller:', error);
      } finally {
        setIsStartingChat(false);
      }
    };
    
    startSellerChat();
  }, [user, sellerIdFromUrl, startConversationWithSeller]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    // Update URL
    router.push(`/messages?id=${conv._id}`, { scroll: false });
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <div className="flex-1 container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border overflow-hidden h-[calc(100vh-140px)] sm:h-[calc(100vh-200px)] min-h-[400px]">
          <div className="flex h-full overflow-hidden">
            {/* Conversation List - Hidden on mobile when chat is open */}
            <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col min-w-0 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b flex items-center justify-between gap-2">
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <span className="truncate">Tin nhắn</span>
                </h1>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAdminDialog(true)}
                  className="shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Shield className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Liên hệ admin</span>
                </Button>
              </div>

              {/* Filters */}
              <div className="p-2 sm:p-3 border-b flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
                <Button
                  variant={!filter.status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({})}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  Tất cả
                </Button>
                <Button
                  variant={filter.status === 'ACTIVE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ status: 'ACTIVE' })}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  Hoạt động
                </Button>
                <Button
                  variant={filter.status === 'DISPUTED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ status: 'DISPUTED' })}
                  className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap"
                >
                  Tranh chấp
                </Button>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                <ConversationList
                  onSelectConversation={handleSelectConversation}
                  selectedId={selectedConversation?._id}
                  filter={filter}
                  chatHook={chatHook}
                />
              </div>
            </div>

            {/* Chat Window */}
            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {isStartingChat ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <h2 className="text-base sm:text-lg font-semibold text-gray-700">
                    Đang kết nối với {sellerNameFromUrl || 'shop'}...
                  </h2>
                </div>
              ) : selectedConversation || conversationIdFromUrl ? (
                <>
                  {/* Chat Header with Seller Info */}
                  <div className="border-b bg-white flex-shrink-0">
                    {/* Mobile back button */}
                    <div className="md:hidden p-2 border-b">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMobileChat(false)}
                        className="text-sm"
                      >
                        ← Quay lại
                      </Button>
                    </div>
                    
                    {/* Seller Profile Header */}
                    {chatSellerInfo && (
                      <div className="p-3 sm:p-4 flex items-center justify-between gap-2 bg-gradient-to-r from-blue-50 to-white">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {chatSellerInfo.sellerProfile?.shopLogo ? (
                              <img 
                                src={chatSellerInfo.sellerProfile.shopLogo} 
                                alt={chatSellerInfo.sellerProfile?.shopName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {chatSellerInfo.sellerProfile?.shopName || chatSellerInfo.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">Người bán</p>
                          </div>
                        </div>
                        <Link 
                          href={`/shop/${chatSellerInfo.id}`}
                          className="flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                        >
                          <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Xem Shop</span>
                          <span className="sm:hidden">Shop</span>
                        </Link>
                      </div>
                    )}
                    
                    {/* Order Info Box */}
                    {chatOrderInfo && (
                      <div className="p-2 sm:p-3 bg-gray-50 border-t">
                        <p className="text-xs text-gray-500 mb-1.5 sm:mb-2 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Tin nhắn về đơn hàng:
                        </p>
                        <Link 
                          href={`/orders/${chatOrderInfo.id}`}
                          className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          {chatOrderInfo.items?.[0]?.product?.images && (
                            <img 
                              src={JSON.parse(chatOrderInfo.items[0].product.images)[0]} 
                              alt=""
                              className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                              {chatOrderInfo.items?.map((i: any) => i.product?.title).join(', ')}
                            </p>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-wrap">
                              <span className="text-blue-600 font-semibold">
                                {new Intl.NumberFormat('vi-VN').format(chatOrderInfo.total)}đ
                              </span>
                              <span className="text-gray-400 hidden sm:inline">•</span>
                              <span className="text-gray-500 truncate">
                                {chatOrderInfo.orderNumber}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <ChatWindow
                    conversationId={selectedConversation?._id || conversationIdFromUrl || undefined}
                    chatHook={chatHook}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                    Chọn một cuộc trò chuyện
                  </h2>
                  <p className="text-sm sm:text-base text-gray-500 max-w-sm">
                    Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu trò chuyện mới với người bán
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Admin Contact Dialog */}
      <AdminContactDialog
        isOpen={showAdminDialog}
        onClose={() => {
          setShowAdminDialog(false);
          // Reload conversations to show new conversation
          chatHook.loadConversations();
        }}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
