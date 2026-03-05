'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Conversation, useChat } from '@/hooks/useChat';
import { MessageCircle, Users, AlertTriangle, CheckCircle, Clock, ArrowLeft, User, Store, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import { API_BASE_URL } from '@/lib/config';

function SellerMessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, checkAuth, isInitialized } = useAuthStore();

  const chatHook = useChat();
  const { conversations, loadConversations, loadConversation, loadMessages, isLoading, currentConversation } = chatHook;

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<{ status?: string; type?: string }>({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, disputed: 0, resolved: 0 });

  const conversationIdFromUrl = searchParams.get('id');

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || user.role !== 'SELLER') router.push('/login');
  }, [user, isInitialized]);

  // Fetch real stats from backend
  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/chat/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats({ total: data.total, active: data.active, disputed: data.disputed, resolved: data.resolved });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [token]);

  // Load conversations
  useEffect(() => {
    if (!token || !user) return;
    loadConversations(filter as any);
  }, [filter, token, user]);

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
    router.push(`/seller/messages?id=${conv._id}`, { scroll: false });
  }, [router, loadConversation, loadMessages]);

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedOther = selectedConversation?.otherParticipant;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tổng hội thoại', value: stats.total, icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Đang hoạt động', value: stats.active, icon: Clock, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
          { label: 'Tranh chấp', value: stats.disputed, icon: AlertTriangle, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
          { label: 'Đã giải quyết', value: stats.resolved, icon: CheckCircle, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl p-4 border hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-[calc(100vh-320px)] min-h-[400px]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="font-semibold flex items-center gap-2 text-gray-800">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Tin nhắn từ khách hàng
              </h2>
            </div>

            {/* Filters */}
            <div className="p-2 border-b flex gap-1.5 overflow-x-auto bg-gray-50/50">
              {[
                { label: 'Tất cả', status: undefined },
                { label: 'Hoạt động', status: 'ACTIVE' },
                { label: 'Tranh chấp', status: 'DISPUTED' },
                { label: 'Đã xử lý', status: 'RESOLVED' },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilter(f.status ? { status: f.status } : {})}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${filter.status === f.status || (!filter.status && !f.status)
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

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
          <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation || conversationIdFromUrl ? (
              <>
                {/* Chat header with buyer info */}
                <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  {selectedOther && (
                    <>
                      <div className="relative">
                        {selectedOther.avatar ? (
                          <img src={`${API_BASE_URL}${selectedOther.avatar}`} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center ring-2 ring-white">
                            <span className="text-sm font-bold text-white">{selectedOther.name?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        {selectedOther.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{selectedOther.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Buyer</span>
                          <span className={`text-[11px] ${selectedOther.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                            {selectedOther.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                          </span>
                        </div>
                      </div>
                      {selectedConversation?.status === 'DISPUTED' && (
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Tranh chấp
                        </span>
                      )}
                    </>
                  )}
                </div>

                <ChatWindow
                  conversationId={selectedConversation?._id || conversationIdFromUrl || undefined}
                  chatHook={chatHook}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-9 h-9 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Chọn một cuộc trò chuyện</h3>
                <p className="text-gray-400 text-sm max-w-xs">Trả lời nhanh để tăng uy tín shop của bạn</p>
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
