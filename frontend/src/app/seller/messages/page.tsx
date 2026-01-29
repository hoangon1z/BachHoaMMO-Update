'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ConversationList, ChatWindow } from '@/components/chat';
import { Conversation, useChat } from '@/hooks/useChat';
import { MessageCircle, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function SellerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checkAuth, isInitialized } = useAuthStore();
  
  // Single useChat instance for entire page
  const chatHook = useChat();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, disputed: 0, resolved: 0 });

  const conversationIdFromUrl = searchParams.get('id');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || user.role !== 'SELLER') {
      router.push('/login');
    }
  }, [user, isInitialized]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
    router.push(`/seller/messages?id=${conv._id}`, { scroll: false });
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Tổng tin nhắn</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.disputed}</p>
              <p className="text-sm text-muted-foreground">Tranh chấp</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Đã xử lý</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-[calc(100vh-350px)] min-h-[400px]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Tin nhắn từ khách hàng
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
                variant={filter.status === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ status: 'ACTIVE' })}
              >
                Hoạt động
              </Button>
              <Button
                variant={filter.status === 'DISPUTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ status: 'DISPUTED' })}
                className="text-yellow-600"
              >
                Tranh chấp
              </Button>
            </div>

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
          <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation || conversationIdFromUrl ? (
              <>
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
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Chọn một cuộc trò chuyện
                </h3>
                <p className="text-gray-500">
                  Trả lời nhanh để tăng uy tín shop của bạn
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerMessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SellerMessagesContent />
    </Suspense>
  );
}
