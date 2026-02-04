'use client';

import { useEffect } from 'react';
import { MessageCircle, ShoppingBag, Shield, AlertTriangle, Check } from 'lucide-react';
import { useChat, Conversation } from '@/hooks/useChat';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/lib/config';

// Helper to get full URL for avatars
const getFullUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
  filter?: {
    status?: string;
    type?: string;
  };
  chatHook: ReturnType<typeof useChat>;
}

export function ConversationList({ onSelectConversation, selectedId, filter, chatHook }: ConversationListProps) {
  const { user } = useAuthStore();
  const { conversations, isLoading, loadConversations } = chatHook;

  // Load conversations on mount and when filter changes
  useEffect(() => {
    console.log('[ConversationList] Loading conversations with filter:', filter);
    loadConversations(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.status, filter?.type, loadConversations]);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };

  const getConversationIcon = (type: string, status: string) => {
    if (status === 'DISPUTED') {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (status === 'RESOLVED') {
      return <Check className="w-5 h-5 text-green-500" />;
    }
    switch (type) {
      case 'BUYER_SELLER':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'BUYER_ADMIN':
      case 'SELLER_ADMIN':
        return <Shield className="w-5 h-5 text-purple-500" />;
      default:
        return <MessageCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPUTED':
        return (
          <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
            Tranh chấp
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
            Đã xử lý
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
            Lưu trữ
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Chưa có cuộc trò chuyện nào</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelectConversation(conv)}
          className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
            selectedId === conv._id ? 'bg-blue-50' : ''
          }`}
        >
          {/* Avatar */}
          <div className="relative">
            {conv.otherParticipant?.avatar ? (
              <img
                src={getFullUrl(conv.otherParticipant.avatar)}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                {getConversationIcon(conv.type, conv.status)}
              </div>
            )}
            {/* Online indicator */}
            {(conv.otherParticipant as any)?.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-semibold truncate text-gray-900">
                  {conv.otherParticipant?.name || conv.subject || 'Cuộc trò chuyện'}
                </span>
                {/* Role badge for conversation type */}
                {conv.type === 'BUYER_ADMIN' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Admin
                  </span>
                )}
                {conv.type === 'SELLER_ADMIN' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Admin
                  </span>
                )}
                {conv.type === 'BUYER_SELLER' && conv.otherParticipant && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Seller
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 shrink-0 ml-2">
                {formatTime(conv.lastMessageAt)}
              </span>
            </div>
            {/* Subject line if available */}
            {conv.subject && conv.subject !== conv.otherParticipant?.name && (
              <p className="text-xs text-gray-600 mb-1 truncate">
                Vấn đề: {conv.subject}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 truncate flex-1">
                {conv.lastMessagePreview || 'Bắt đầu trò chuyện...'}
              </p>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                {getStatusBadge(conv.status)}
                {conv.unreadCount && conv.unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center px-1.5">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
