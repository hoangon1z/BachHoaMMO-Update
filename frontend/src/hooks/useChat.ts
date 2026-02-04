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

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'PRODUCT';
  attachments?: Attachment[];
  productEmbed?: ProductEmbed;
  readBy?: { userId: string; readAt: string }[];
  isHidden?: boolean;
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
  };
  unreadCount?: number;
  createdAt: string;
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
  // Actions
  loadConversations: (options?: { status?: string; type?: string }) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  loadMessages: (conversationId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, type?: string, attachments?: Attachment[], productEmbed?: ProductEmbed) => void;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: () => void;
  startConversationWithSeller: (sellerId: string, productId?: string, message?: string) => Promise<Conversation>;
  startConversationWithAdmin: (subject: string, message: string, orderId?: string) => Promise<Conversation>;
  openDispute: (reason: string) => Promise<void>;
  markConversationComplete: () => Promise<void>;
}

function resolveSocketUrl() {
  // Prefer explicit env, otherwise fall back to same host as the page (common in deployments)
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    // Assume backend is on same host but port 3001 in local dev
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

  // Initialize socket connection
  useEffect(() => {
    if (!token || !user) {
      console.log('[Chat] useEffect: No token or user, skipping socket connection');
      return;
    }

    console.log('[Chat] useEffect: Initializing socket connection for user:', user.id);
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
      console.log('[Chat] Socket ID:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Initialize notification system
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
      console.log('[Chat] 📩 New message received:', { conversationId, message });
      
      // Check if message is from someone else (not current user)
      const isFromOther = message.senderId !== user?.id;
      
      // Play notification sound and show browser notification for messages from others
      if (isFromOther) {
        notifyNewMessage(
          message.senderName || 'Người dùng',
          message.content || 'Đã gửi tin nhắn mới',
          user?.id,
          message.senderId
        );
      }
      
      // Add message to current conversation's messages
      setMessages((prev) => {
        // Check if this message is for the currently loaded conversation
        // We need to check against the messages array's conversationId
        if (prev.length > 0 && prev[0].conversationId === conversationId) {
          console.log('[Chat] Adding message to current conversation');
          // Check if message already exists (prevent duplicates)
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        } else if (prev.length === 0) {
          // If no messages yet, this might be the first message for this conversation
          console.log('[Chat] First message for conversation');
          return [message];
        }
        console.log('[Chat] Message for different conversation, not adding to current messages');
        return prev;
      });
      
      // Update conversation preview and unread count
      setConversations((prev) => {
        const existingIndex = prev.findIndex(conv => conv._id === conversationId);
        
        if (existingIndex >= 0) {
          // Update existing conversation
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
          
          // Calculate total unread for tab title
          if (isFromOther) {
            const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            updateTabTitle(totalUnread, true);
          }
          
          return updated;
        } else {
          // Conversation not in list yet - fetch it and add to list
          console.log('[Chat] New conversation detected, will be added on next loadConversations');
          return prev;
        }
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
        
        // Update tab title with total unread
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
      console.log('[Chat] 📖 Messages marked as read:', { conversationId, readBy });
      
      setMessages((prev) => {
        // Check if we have messages for this conversation
        if (prev.length === 0 || prev[0].conversationId !== conversationId) {
          console.log('[Chat] Read receipt for different conversation, ignoring');
          return prev;
        }
        
        // Update read status for all messages sent by current user
        return prev.map((msg) => {
          // Skip if this message was sent by the user who read it
          if (msg.senderId === readBy) {
            return msg;
          }
          
          // Check if this user already marked as read
          const alreadyRead = msg.readBy?.some(r => r.userId === readBy);
          if (alreadyRead) {
            return msg;
          }
          
          // Add read receipt
          return {
            ...msg,
            readBy: [...(msg.readBy || []), { 
              userId: readBy, 
              readAt: readAt || new Date().toISOString() 
            }],
          };
        });
      });
    });

    // Handle user online/offline
    socket.on('user:online', ({ userId }) => {
      // Update conversation list to show online status
      setConversations((prev) =>
        prev.map((conv) => {
          if (!conv.otherParticipant) return conv;
          if (conv.otherParticipant.id !== userId) return conv;
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              isOnline: true,
            },
          };
        })
      );
    });

    socket.on('user:offline', ({ userId }) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (!conv.otherParticipant) return conv;
          if (conv.otherParticipant.id !== userId) return conv;
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              isOnline: false,
            },
          };
        })
      );
    });

    socketRef.current = socket;

    return () => {
      console.log('[Chat] useEffect cleanup: Disconnecting socket');
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

      // Admin should use admin endpoint to see all conversations
      const endpoint = user?.role === 'ADMIN' ? '/api/chat/admin/conversations' : '/api/chat/conversations';

      const response = await fetch(`${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        
        // Update tab title with total unread count
        const totalUnread = data.conversations.reduce((sum: number, c: Conversation) => sum + (c.unreadCount || 0), 0);
        if (totalUnread > 0) {
          updateTabTitle(totalUnread, false);
        }
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
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        
        // Join socket room
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
    console.log('[Chat] Loading messages for conversation:', conversationId);
    try {
      const params = new URLSearchParams();
      if (loadMore && messages.length > 0) {
        params.append('before', messages[0].createdAt);
      }

      const response = await fetch(`/api/chat/conversations/${conversationId}/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('[Chat] Messages loaded:', { count: data.messages?.length, hasMore: data.hasMore });
      if (data.success) {
        if (loadMore) {
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        setHasMoreMessages(data.hasMore);
      } else {
        console.error('[Chat] Failed to load messages:', data);
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
    productEmbed?: ProductEmbed
  ) => {
    if (!currentConversation || !socketRef.current) {
      console.error('[Chat] Cannot send message: no conversation or socket');
      return;
    }

    console.log('[Chat] 📤 Sending message:', { conversationId: currentConversation._id, content });
    socketRef.current.emit('message:send', {
      conversationId: currentConversation._id,
      content,
      type,
      attachments,
      productEmbed,
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
    
    // Update local unread count
    setConversations((prev) => {
      const updated = prev.map((conv) =>
        conv._id === currentConversation._id ? { ...conv, unreadCount: 0 } : conv
      );
      
      // Update tab title
      const totalUnread = updated.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      updateTabTitle(totalUnread, false);
      
      return updated;
    });
  }, [currentConversation]);

  // Start conversation with seller
  const startConversationWithSeller = useCallback(async (
    sellerId: string,
    productId?: string,
    message?: string
  ): Promise<Conversation> => {
    const response = await fetch('/api/chat/start-with-seller', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sellerId, productId, message }),
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      socketRef.current?.emit('conversation:join', { conversationId: data.conversation._id });
      
      // Add conversation to list if not already present
      setConversations((prev) => {
        const exists = prev.some(conv => conv._id === data.conversation._id);
        if (exists) {
          // Update existing conversation
          return prev.map(conv => 
            conv._id === data.conversation._id ? data.conversation : conv
          );
        } else {
          // Add new conversation at the top
          return [data.conversation, ...prev];
        }
      });
      
      return data.conversation;
    }
    throw new Error(data.message || 'Failed to start conversation');
  }, [token]);

  // Start conversation with admin
  const startConversationWithAdmin = useCallback(async (
    subject: string,
    message: string,
    orderId?: string
  ): Promise<Conversation> => {
    const response = await fetch('/api/chat/start-with-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subject, message, orderId }),
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      socketRef.current?.emit('conversation:join', { conversationId: data.conversation._id });
      
      // Add conversation to list if not already present
      setConversations((prev) => {
        const exists = prev.some(conv => conv._id === data.conversation._id);
        if (exists) {
          // Update existing conversation
          return prev.map(conv => 
            conv._id === data.conversation._id ? data.conversation : conv
          );
        } else {
          // Add new conversation at the top
          return [data.conversation, ...prev];
        }
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
    }
  }, [token, currentConversation]);

  // Mark conversation as complete
  const markConversationComplete = useCallback(async () => {
    if (!currentConversation) return;

    const response = await fetch(`/api/chat/conversations/${currentConversation._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (data.success) {
      setCurrentConversation(data.conversation);
      // Update in conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === data.conversation._id ? data.conversation : conv
        )
      );
    }
  }, [token, currentConversation]);

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
  };
}
