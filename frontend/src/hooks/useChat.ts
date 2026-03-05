'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import {
  notifyNewMessage,
  updateTabTitle,
  initNotificationSound,
  requestNotificationPermission
} from '@/lib/notifications';

export interface ReplyTo {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'PRODUCT';
  systemAction?: string;
  attachments?: Attachment[];
  productEmbed?: ProductEmbed;
  replyTo?: ReplyTo;
  reactions?: Reaction[];
  readBy?: { userId: string; readAt: string }[];
  isHidden?: boolean;
  hiddenBy?: string;
  hiddenReason?: string;
  isRecalled?: boolean;
  recalledAt?: string;
  recalledContent?: string; // Only visible to admin
  recalledAttachments?: Attachment[]; // Only visible to admin
  isEdited?: boolean;
  editedAt?: string;
  originalContent?: string;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  createdAt: string;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface ProductEmbed {
  productId: string;
  title: string;
  price: number;
  image: string;
}

export interface Conversation {
  _id: string;
  type: 'BUYER_SELLER' | 'BUYER_ADMIN' | 'SELLER_ADMIN';
  buyerId?: string;
  sellerId?: string;
  adminId?: string;
  productId?: string;
  orderId?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED' | 'DISPUTED';
  subject?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  buyerUnreadCount?: number;
  sellerUnreadCount?: number;
  adminUnreadCount?: number;
  otherParticipant?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  unreadCount?: number;
  createdAt: string;
  disputeReason?: string;
  // Completion confirmation fields
  buyerCompleted?: boolean;
  sellerCompleted?: boolean;
  completedAt?: string;
  resolution?: string;
}

export interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface ModerationWarning {
  message: string;
  isBlocked: boolean;
  action: string;
  violations?: { type: string; severity: string }[];
}

interface SendMessageResult {
  success: boolean;
  blocked?: boolean;
  error?: string;
  action?: string;
}

interface UseChatReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingUser[];
  unreadCount: number;
  isLoading: boolean;
  hasMoreMessages: boolean;
  moderationWarning: ModerationWarning | null;
  clearModerationWarning: () => void;
  // Actions
  loadConversations: (options?: { status?: string; type?: string }) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  loadMessages: (conversationId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, type?: string, attachments?: Attachment[], productEmbed?: ProductEmbed, replyTo?: ReplyTo) => Promise<SendMessageResult>;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: () => void;
  startConversationWithSeller: (sellerId: string, productId?: string, message?: string) => Promise<Conversation>;
  startConversationWithAdmin: (subject: string, message: string, orderId?: string) => Promise<Conversation>;
  openDispute: (reason: string) => Promise<void>;
  markConversationComplete: () => Promise<void>;
  // New actions
  recallMessage: (messageId: string) => void;
  editMessage: (messageId: string, content: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  pinMessage: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;
}

function resolveSocketUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

const SOCKET_URL = resolveSocketUrl();

export function useChat(): UseChatReturn {
  const { user, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [moderationWarning, setModerationWarning] = useState<ModerationWarning | null>(null);

  const clearModerationWarning = useCallback(() => {
    setModerationWarning(null);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user) return;

    setConnectionError(null);

    const socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Chat] ✓ Connected to Socket.IO');
      setIsConnected(true);
      setConnectionError(null);
      initNotificationSound();
      requestNotificationPermission();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Chat] connect_error:', err?.message || err);
      setConnectionError(err?.message || 'Không thể kết nối realtime');
      setIsConnected(false);
    });

    // Handle new messages
    socket.on('message:new', ({ message, conversationId }) => {
      const isFromOther = message.senderId !== user?.id;

      if (isFromOther) {
        notifyNewMessage(
          message.senderName || 'Người dùng',
          message.content || 'Đã gửi tin nhắn mới',
          user?.id,
          message.senderId
        );
      }

      setMessages((prev) => {
        if (prev.length > 0 && prev[0].conversationId === conversationId) {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        } else if (prev.length === 0) {
          return [message];
        }
        return prev;
      });

      setConversations((prev) => {
        const existingIndex = prev.findIndex(conv => conv._id === conversationId);
        if (existingIndex >= 0) {
          const updated = prev.map((conv) =>
            conv._id === conversationId
              ? {
                ...conv,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.content,
                unreadCount: isFromOther ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
              }
              : conv
          );
          if (isFromOther) {
            const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            updateTabTitle(totalUnread, true);
          }
          return updated;
        }
        return prev;
      });
    });

    // Handle conversation updates
    socket.on('conversation:update', ({ conversationId, lastMessage }) => {
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv._id === conversationId
            ? {
              ...conv,
              lastMessageAt: lastMessage.createdAt,
              lastMessagePreview: lastMessage.content,
              unreadCount: (conv.unreadCount || 0) + 1,
            }
            : conv
        );
        const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        updateTabTitle(totalUnread, true);
        return updated;
      });
      setUnreadCount((prev) => prev + 1);
    });

    // Handle typing indicators
    socket.on('typing:update', ({ userId, oderId, userName, conversationId, isTyping }) => {
      const effectiveUserId = userId || oderId;
      if (isTyping) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === effectiveUserId)) return prev;
          return [...prev, { userId: effectiveUserId, userName, conversationId }];
        });
      } else {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== effectiveUserId));
      }
    });

    // Handle read receipts
    socket.on('messages:read', ({ conversationId, readBy, readAt }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.map((msg) => {
          if (msg.senderId === readBy) return msg;
          const alreadyRead = msg.readBy?.some(r => r.userId === readBy);
          if (alreadyRead) return msg;
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { userId: readBy, readAt: readAt || new Date().toISOString() }],
          };
        });
      });
    });

    // Handle message recalled
    socket.on('message:recalled', ({ messageId, conversationId }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isRecalled: true, content: '', attachments: [] }
            : msg
        );
      });
    });

    // Handle message edited
    socket.on('message:edited', ({ messageId, conversationId, content, editedAt }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, content, isEdited: true, editedAt }
            : msg
        );
      });
    });

    // Handle message reactions
    socket.on('message:reacted', ({ messageId, conversationId, reactions }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        );
      });
    });

    // Handle message pinned
    socket.on('message:pinned', ({ messageId, conversationId, isPinned }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.map((msg) => {
          if (msg._id === messageId) return { ...msg, isPinned };
          if (isPinned && msg.isPinned) return { ...msg, isPinned: false };
          return msg;
        });
      });
    });

    // Handle message deleted
    socket.on('message:deleted', ({ messageId, conversationId }) => {
      setMessages((prev) => {
        if (prev.length === 0 || prev[0].conversationId !== conversationId) return prev;
        return prev.filter(msg => msg._id !== messageId);
      });
    });

    // Handle user online/offline
    socket.on('user:online', ({ userId }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (!conv.otherParticipant || conv.otherParticipant.id !== userId) return conv;
          return { ...conv, otherParticipant: { ...conv.otherParticipant, isOnline: true } };
        })
      );
    });

    socket.on('user:offline', ({ userId }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (!conv.otherParticipant || conv.otherParticipant.id !== userId) return conv;
          return { ...conv, otherParticipant: { ...conv.otherParticipant, isOnline: false } };
        })
      );
    });

    // Handle chat moderation warnings
    socket.on('chat:warning', (data: { message: string; violations: { type: string; severity: string }[] }) => {
      setModerationWarning({ message: data.message, isBlocked: false, action: 'WARN', violations: data.violations });
      setTimeout(() => setModerationWarning(null), 10000);
    });

    socket.on('message:blocked', (data: { error: string; action: string; blocked: boolean; violations?: { type: string; severity: string }[] }) => {
      setModerationWarning({
        message: data.error || 'Tin nhắn đã bị chặn do vi phạm quy định.',
        isBlocked: true,
        action: data.action || 'BLOCK',
        violations: data.violations,
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  // Load conversations
  const loadConversations = useCallback(async (options?: { status?: string; type?: string }) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.type) params.append('type', options.type);
      const endpoint = user?.role === 'ADMIN' ? '/api/chat/admin/conversations' : '/api/chat/conversations';
      const response = await fetch(`${endpoint}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        const totalUnread = data.conversations.reduce((sum: number, c: Conversation) => sum + (c.unreadCount || 0), 0);
        if (totalUnread > 0) updateTabTitle(totalUnread, false);
      }
    } catch (error) {
      console.error('[Chat] Load conversations error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.role]);

  // Load single conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        socketRef.current?.emit('conversation:join', { conversationId });
      }
    } catch (error) {
      console.error('[Chat] Load conversation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load messages
  const loadMessages = useCallback(async (conversationId: string, loadMore = false) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (loadMore && messages.length > 0) {
        params.append('before', messages[0].createdAt);
      }
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        if (loadMore) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMoreMessages(data.hasMore);
      }
    } catch (error) {
      console.error('[Chat] Load messages error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, messages]);

  // Send message
  const sendMessage = useCallback((
    content: string,
    type = 'TEXT',
    attachments?: Attachment[],
    productEmbed?: ProductEmbed,
    replyTo?: ReplyTo,
  ): Promise<SendMessageResult> => {
    return new Promise((resolve) => {
      if (!currentConversation || !socketRef.current) {
        resolve({ success: false, error: 'No connection' });
        return;
      }
      socketRef.current.emit('message:send', {
        conversationId: currentConversation._id,
        content,
        type,
        attachments,
        productEmbed,
        replyTo,
      }, (response: any) => {
        if (response && !response.success && response.blocked) {
          setModerationWarning({
            message: response.error || 'Tin nhắn đã bị chặn do vi phạm quy định.',
            isBlocked: true,
            action: response.action || 'BLOCK',
            violations: response.violations,
          });
        }
        resolve(response || { success: true });
      });
      setTimeout(() => resolve({ success: true }), 5000);
    });
  }, [currentConversation]);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('typing:start', { conversationId: currentConversation._id });
  }, [currentConversation]);

  const stopTyping = useCallback(() => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('typing:stop', { conversationId: currentConversation._id });
  }, [currentConversation]);

  // Mark as read
  const markAsRead = useCallback(() => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('messages:read', { conversationId: currentConversation._id });
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === currentConversation._id ? { ...conv, unreadCount: 0 } : conv
      );
      const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      updateTabTitle(totalUnread, false);
      return updated;
    });
  }, [currentConversation]);

  // Start conversation with seller
  const startConversationWithSeller = useCallback(async (sellerId: string, productId?: string, message?: string): Promise<Conversation> => {
    const response = await fetch('/api/chat/start-with-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sellerId, productId, message }),
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      socketRef.current?.emit('conversation:join', { conversationId: data.conversation._id });
      setConversations((prev) => {
        const exists = prev.some(conv => conv._id === data.conversation._id);
        return exists
          ? prev.map(conv => conv._id === data.conversation._id ? data.conversation : conv)
          : [data.conversation, ...prev];
      });
      return data.conversation;
    }
    throw new Error(data.message || 'Failed to start conversation');
  }, [token]);

  // Start conversation with admin
  const startConversationWithAdmin = useCallback(async (subject: string, message: string, orderId?: string): Promise<Conversation> => {
    const response = await fetch('/api/chat/start-with-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject, message, orderId }),
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      socketRef.current?.emit('conversation:join', { conversationId: data.conversation._id });
      setConversations((prev) => {
        const exists = prev.some(conv => conv._id === data.conversation._id);
        return exists
          ? prev.map(conv => conv._id === data.conversation._id ? data.conversation : conv)
          : [data.conversation, ...prev];
      });
      return data.conversation;
    }
    throw new Error(data.message || 'Failed to start conversation');
  }, [token]);

  // Open dispute
  const openDispute = useCallback(async (reason: string) => {
    if (!currentConversation) return;
    const response = await fetch(`/api/chat/conversations/${currentConversation._id}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (data.success) setCurrentConversation(data.conversation);
  }, [token, currentConversation]);

  // Mark conversation as complete
  const markConversationComplete = useCallback(async () => {
    if (!currentConversation) return;
    const response = await fetch(`/api/chat/conversations/${currentConversation._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      setConversations((prev) => prev.map((conv) => conv._id === data.conversation._id ? data.conversation : conv));
    }
  }, [token, currentConversation]);

  // ============================================
  // NEW MESSAGE ACTIONS
  // ============================================

  const recallMessage = useCallback((messageId: string) => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('message:recall', {
      messageId,
      conversationId: currentConversation._id,
    });
  }, [currentConversation]);

  const editMessage = useCallback((messageId: string, content: string) => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('message:edit', {
      messageId,
      conversationId: currentConversation._id,
      content,
    });
  }, [currentConversation]);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('message:react', {
      messageId,
      conversationId: currentConversation._id,
      emoji,
    });
  }, [currentConversation]);

  const pinMessage = useCallback((messageId: string) => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('message:pin', {
      messageId,
      conversationId: currentConversation._id,
    });
  }, [currentConversation]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!currentConversation || !socketRef.current) return;
    socketRef.current.emit('message:delete', {
      messageId,
      conversationId: currentConversation._id,
    });
  }, [currentConversation]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    conversations,
    currentConversation,
    messages,
    typingUsers,
    unreadCount,
    isLoading,
    hasMoreMessages,
    moderationWarning,
    clearModerationWarning,
    loadConversations,
    loadConversation,
    loadMessages,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    startConversationWithSeller,
    startConversationWithAdmin,
    openDispute,
    markConversationComplete,
    recallMessage,
    editMessage,
    reactToMessage,
    pinMessage,
    deleteMessage,
  };
}
