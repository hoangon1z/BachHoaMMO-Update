'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { ConversationList, ChatWindow, AdminContactDialog } from '@/components/chat';
import { Conversation } from '@/hooks/useChat';
import { useChat } from '@/hooks/useChat';
import { MessageCircle, Filter, Search, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth, isInitialized } = useAuthStore();
  
  // Single useChat instance for entire page
  const chatHook = useChat();
  const { startConversationWithAdmin } = chatHook;
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  // Get conversation ID from URL
  const conversationIdFromUrl = searchParams.get('id');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login?redirect=/messages');
    }
  }, [user, isInitialized]);

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

      <div className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
          <div className="flex h-full">
            {/* Conversation List - Hidden on mobile when chat is open */}
            <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between gap-2">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-primary" />
                  Tin nhắn
                </h1>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAdminDialog(true)}
                  className="shrink-0"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Liên hệ admin
                </Button>
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
                  Đang hoạt động
                </Button>
                <Button
                  variant={filter.status === 'DISPUTED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ status: 'DISPUTED' })}
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
            <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation || conversationIdFromUrl ? (
                <>
                  {/* Mobile back button */}
                  <div className="md:hidden p-3 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMobileChat(false)}
                    >
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
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Chọn một cuộc trò chuyện
                  </h2>
                  <p className="text-gray-500 max-w-sm">
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
