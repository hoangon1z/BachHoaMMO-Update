'use client';

import { useState, useMemo } from 'react';
import { Search, MessageSquare, ShieldCheck, Store, User, Clock, AlertTriangle, CheckCircle, Archive } from 'lucide-react';
import { Conversation } from '@/hooks/useChat';
import { API_BASE_URL } from '@/lib/config';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  currentUserId?: string;
  currentUserRole?: string;
  isLoading?: boolean;
}

function getFullUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes}p`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'ACTIVE': return { icon: MessageSquare, label: 'Đang hoạt động', color: 'text-green-500', bg: 'bg-green-50' };
    case 'DISPUTED': return { icon: AlertTriangle, label: 'Tranh chấp', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    case 'RESOLVED': return { icon: CheckCircle, label: 'Đã giải quyết', color: 'text-blue-500', bg: 'bg-blue-50' };
    case 'ARCHIVED': return { icon: Archive, label: 'Đã lưu trữ', color: 'text-gray-400', bg: 'bg-gray-50' };
    default: return { icon: MessageSquare, label: status, color: 'text-gray-500', bg: 'bg-gray-50' };
  }
}

function getRoleBadge(type: string, currentUserRole?: string) {
  if (type === 'BUYER_ADMIN' || type === 'SELLER_ADMIN') {
    return { label: 'Admin', icon: ShieldCheck, color: 'text-red-500 bg-red-50' };
  }
  if (type === 'BUYER_SELLER') {
    // Show the OTHER role, not current user's role
    if (currentUserRole === 'SELLER') {
      return { label: 'Buyer', icon: User, color: 'text-blue-500 bg-blue-50' };
    }
    return { label: 'Seller', icon: Store, color: 'text-emerald-500 bg-emerald-50' };
  }
  return null;
}

export function ConversationList({
  conversations, selectedId, onSelect, currentUserId, currentUserRole, isLoading,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c =>
      c.otherParticipant?.name?.toLowerCase().includes(query) ||
      c.subject?.toLowerCase().includes(query) ||
      c.lastMessagePreview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="space-y-0">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
              <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full w-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full h-9 pl-9 pr-3 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv._id === selectedId;
            const unread = conv.unreadCount || 0;
            const role = getRoleBadge(conv.type, currentUserRole);
            const statusCfg = getStatusConfig(conv.status);
            const other = conv.otherParticipant;
            const avatarUrl = other?.avatar ? getFullUrl(other.avatar) : '';

            return (
              <button
                key={conv._id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-all border-b border-gray-50 ${isSelected
                    ? 'bg-blue-50/80 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-50/80 border-l-2 border-l-transparent'
                  } ${unread > 0 ? 'bg-blue-50/30' : ''}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100" />
                  ) : (
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(other?.name || conv.subject || '')} flex items-center justify-center ring-2 ring-white shadow-sm`}>
                      <span className="text-sm font-bold text-white">{(other?.name || conv.subject)?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  )}
                  {/* Online indicator */}
                  {other?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[13px] font-semibold truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {other?.name || conv.subject || 'Cuộc trò chuyện'}
                    </span>
                    {role && (
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${role.color}`}>
                        {role.label}
                      </span>
                    )}
                  </div>

                  {/* Status badge if not active */}
                  {conv.status !== 'ACTIVE' && (
                    <div className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full mb-0.5 ${statusCfg.bg} ${statusCfg.color}`}>
                      <statusCfg.icon className="w-2.5 h-2.5" />
                      {statusCfg.label}
                    </div>
                  )}

                  {/* Last message preview */}
                  <p className={`text-[12px] truncate ${unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessagePreview || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}
                  </span>
                  {unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-blue-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function getAvatarGradient(name: string) {
  const gradients = [
    'from-blue-400 to-indigo-500',
    'from-pink-400 to-rose-500',
    'from-green-400 to-emerald-500',
    'from-amber-400 to-orange-500',
    'from-purple-400 to-violet-500',
    'from-cyan-400 to-teal-500',
    'from-red-400 to-pink-500',
    'from-teal-400 to-cyan-500',
  ];
  const charCode = name?.charCodeAt(0) || 0;
  return gradients[charCode % gradients.length];
}
