'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, Paperclip, Image as ImageIcon, X, Loader2, AlertTriangle,
  CheckCircle, ShieldAlert, Shield, FileText, Smile, ChevronDown,
  CornerUpLeft, Zap, Pin, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat, Message, ReplyTo } from '@/hooks/useChat';
import { useAuthStore } from '@/store/authStore';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { API_BASE_URL } from '@/lib/config';

interface ChatWindowProps {
  conversationId?: string;
  sellerId?: string;
  sellerName?: string;
  productId?: string;
  productTitle?: string;
  isWidget?: boolean;
  chatHook?: ReturnType<typeof useChat>;
}

// Quick reply templates for sellers
const QUICK_REPLIES = [
  { label: '👋 Chào', text: 'Xin chào! Cảm ơn bạn đã liên hệ. Mình có thể giúp gì cho bạn?' },
  { label: '✅ Xác nhận', text: 'Đơn hàng đã được xác nhận. Mình sẽ xử lý và giao sớm nhất có thể nhé!' },
  { label: '📦 Đã giao', text: 'Đơn hàng đã được giao. Vui lòng kiểm tra và xác nhận nhé!' },
  { label: '🙏 Cảm ơn', text: 'Cảm ơn bạn đã mua hàng! Nếu cần hỗ trợ gì thêm, đừng ngại nhắn mình nhé.' },
  { label: '⏰ Chờ', text: 'Mình đang xử lý yêu cầu của bạn. Vui lòng chờ thêm một chút nhé!' },
];

const EMOJI_LIST = ['😀', '😂', '🥰', '😍', '🤔', '😅', '😢', '😤', '🤝', '👍', '👎', '❤️', '🔥', '🎉', '💯', '⭐', '✅', '❌', '📦', '💳', '🛒', '🏠'];

export function ChatWindow({
  conversationId: initialConversationId,
  sellerId, sellerName, productId, productTitle,
  isWidget = false,
  chatHook: providedChatHook,
}: ChatWindowProps) {
  const { user } = useAuthStore();
  const localChatHook = useChat();
  const chatHook = providedChatHook || localChatHook;

  const {
    isConnected, connectionError, currentConversation, messages, typingUsers,
    isLoading, hasMoreMessages, loadConversation, loadMessages, sendMessage,
    startTyping, stopTyping, markAsRead, startConversationWithSeller, openDispute,
    markConversationComplete, moderationWarning, clearModerationWarning,
    recallMessage, editMessage, reactToMessage, pinMessage, deleteMessage,
  } = chatHook;

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  // Show safety warning — check localStorage with 7-day expiry
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('chat_safety_dismissed');
      if (dismissed) {
        const expiry = parseInt(dismissed, 10);
        if (Date.now() < expiry) return; // still within dismiss period
      }
      setShowSafetyWarning(true);
    } catch { setShowSafetyWarning(true); }
  }, []);

  const dismissSafetyWarning = () => {
    setShowSafetyWarning(false);
    try {
      // Dismiss for 7 days
      localStorage.setItem('chat_safety_dismissed', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch { }
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isSeller = user?.role === 'SELLER';

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
      loadMessages(initialConversationId);
    } else if (sellerId) {
      startConversationWithSeller(sellerId, productId, productTitle ? `Hỏi về: ${productTitle}` : undefined)
        .then((conv) => loadMessages(conv._id))
        .catch(console.error);
    }
  }, [initialConversationId, sellerId, productId]);

  // Auto-focus input on conversation load
  useEffect(() => {
    if (currentConversation && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentConversation?._id, isLoading]);

  // Re-focus input after sending completes (isSending: true -> false)
  const prevIsSendingRef = useRef(false);
  useEffect(() => {
    if (prevIsSendingRef.current && !isSending) {
      // Delay to ensure textarea is re-enabled by React before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    prevIsSendingRef.current = isSending;
  }, [isSending]);

  // Scroll handling
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior });
    }
  }, []);

  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      prevMessageCountRef.current = messages.length;
      isInitialLoadRef.current = false;
      // Use multiple delays to ensure DOM is rendered before scrolling
      setTimeout(() => scrollToBottom('auto'), 50);
      setTimeout(() => scrollToBottom('auto'), 200);
      return;
    }
    if (messages.length > prevMessageCountRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessageCountRef.current = 0;
  }, [currentConversation?._id]);

  // Detect scroll position for "jump to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollDown(!isNearBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Mark as read
  useEffect(() => {
    if (currentConversation && !isAdmin && typeof document !== 'undefined' && document.visibilityState === 'visible') markAsRead();
  }, [currentConversation?._id, messages.length, isAdmin]);

  useEffect(() => {
    if (!currentConversation || isAdmin) return;
    const h = () => { if (document.visibilityState === 'visible') markAsRead(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [currentConversation?._id, isAdmin]);

  // Close emoji picker on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    if (showEmojiPicker) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showEmojiPicker]);

  // Typing handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    startTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 2000);
  };

  // File selection handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const newImages = [...selectedImages, ...files].slice(0, 5);
    setSelectedImages(newImages);
    const newPreviews: string[] = [];
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => { newPreviews.push(e.target?.result as string); if (newPreviews.length === newImages.length) setImagePreviews(newPreviews); };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files].slice(0, 3));
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Paste images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items).filter(item => item.type.startsWith('image/'));
    if (items.length === 0) return;
    e.preventDefault();
    const files = items.map(item => item.getAsFile()).filter(Boolean) as File[];
    if (files.length === 0) return;
    const newImages = [...selectedImages, ...files].slice(0, 5);
    setSelectedImages(newImages);
    const newPreviews: string[] = [];
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => { newPreviews.push(e.target?.result as string); if (newPreviews.length === newImages.length) setImagePreviews(newPreviews); };
      reader.readAsDataURL(file);
    });
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter(f => f.type.startsWith('image/'));
    const docs = files.filter(f => !f.type.startsWith('image/'));
    if (images.length > 0) {
      const newImages = [...selectedImages, ...images].slice(0, 5);
      setSelectedImages(newImages);
      const newPreviews: string[] = [];
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => { newPreviews.push(e.target?.result as string); if (newPreviews.length === newImages.length) setImagePreviews(newPreviews); };
        reader.readAsDataURL(file);
      });
    }
    if (docs.length > 0) setSelectedFiles(prev => [...prev, ...docs].slice(0, 3));
  };

  // Upload attachments
  const uploadAttachments = async (files: File[]): Promise<any[]> => {
    if (files.length === 0) return [];
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.attachments || [];
  };

  // Send message
  const handleSend = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || isSending) return;
    setIsSending(true);
    setIsUploading(true);
    stopTyping();
    try {
      let attachments: any[] = [];
      let messageType: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT';
      if (selectedImages.length > 0) { attachments = await uploadAttachments(selectedImages); messageType = 'IMAGE'; }
      else if (selectedFiles.length > 0) { attachments = await uploadAttachments(selectedFiles); messageType = 'FILE'; }

      const result = await sendMessage(
        inputValue.trim() || '',
        messageType,
        attachments.length > 0 ? attachments : undefined,
        undefined,
        replyTo || undefined,
      );

      if (!result?.blocked) {
        setInputValue('');
        setSelectedImages([]);
        setImagePreviews([]);
        setSelectedFiles([]);
        setReplyTo(null);
        if (inputRef.current) inputRef.current.style.height = 'auto';
      }
      // Focus handled by useEffect on isSending
    } catch (error) {
      setSendError('Không thể gửi tin nhắn. Vui lòng thử lại!');
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleLoadMore = () => {
    if (currentConversation && hasMoreMessages && !isLoading) loadMessages(currentConversation._id, true);
  };

  const handleReply = (msg: Message) => {
    setReplyTo({
      messageId: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content?.substring(0, 100) || '[Đính kèm]',
      type: msg.type,
    });
    inputRef.current?.focus();
  };

  const handleQuickReply = (text: string) => {
    setInputValue(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  // Message grouping + date separator logic
  const getDateSeparator = (date: string, prevDate?: string) => {
    const d = new Date(date);
    const p = prevDate ? new Date(prevDate) : null;
    if (p && d.toDateString() === p.toDateString()) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isMessageGrouped = (msg: Message, prevMsg?: Message) => {
    if (!prevMsg) return false;
    if (prevMsg.senderId !== msg.senderId) return false;
    if (prevMsg.type === 'SYSTEM') return false;
    const diff = new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return diff < 2 * 60 * 1000; // 2 minutes
  };

  const currentTypingUsers = typingUsers.filter(
    (u) => u.conversationId === currentConversation?._id && u.userId !== user?.id
  );

  // Get pinned message
  const pinnedMessage = messages.find(m => m.isPinned);

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 animate-pulse">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
        <p className="text-gray-500 text-sm">Đang kết nối realtime...</p>
        {connectionError && <p className="text-xs text-red-500 mt-2 max-w-sm">Lỗi: {connectionError}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isWidget ? 'h-[calc(500px-56px)]' : 'h-full'} min-h-0 overflow-hidden`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <ImageIcon className="w-10 h-10 text-blue-500 mx-auto mb-2" />
            <p className="text-blue-600 font-medium">Thả file vào đây</p>
          </div>
        </div>
      )}

      {/* Pinned message bar */}
      {pinnedMessage && (
        <div className="px-3 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center gap-2 flex-shrink-0">
          <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-amber-600 font-medium">{pinnedMessage.senderName}: </span>
            <span className="text-[11px] text-amber-800 truncate">{pinnedMessage.content?.substring(0, 80) || '[Đính kèm]'}</span>
          </div>
        </div>
      )}

      {/* Safety Warning Banner */}
      {showSafetyWarning && (
        <div className="mx-2 sm:mx-4 mt-2 flex-shrink-0 animate-in slide-in-from-top duration-300">
          <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-amber-800 leading-tight">Lưu ý giao dịch an toàn</p>
              <p className="text-[11px] text-amber-600/90 mt-0.5 leading-relaxed">
                Không giao dịch bên ngoài nền tảng. Mọi thanh toán qua Zalo, Facebook, chuyển khoản trực tiếp đều <strong>không được bảo vệ</strong> và vi phạm điều khoản sử dụng.
              </p>
            </div>
            <button
              onClick={dismissSafetyWarning}
              className="p-1 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0"
              title="Ẩn thông báo"
            >
              <X className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-0 min-h-0 relative">
        {hasMoreMessages && (
          <div className="text-center mb-3">
            <button onClick={handleLoadMore} disabled={isLoading}
              className="px-4 py-1.5 text-[12px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full font-medium transition-colors disabled:opacity-50">
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Tải thêm tin nhắn'}
            </button>
          </div>
        )}

        {messages.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Send className="w-7 h-7 text-gray-300 -rotate-45" />
            </div>
            <p className="text-gray-400 text-sm">Bắt đầu cuộc trò chuyện</p>
            {productTitle && <p className="text-gray-400 text-xs mt-1">Về sản phẩm: {productTitle}</p>}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : undefined;
            const dateSep = getDateSeparator(msg.createdAt, prevMsg?.createdAt);
            const grouped = isMessageGrouped(msg, prevMsg);
            return (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={msg.senderId === user?.id}
                isGrouped={grouped}
                showDateSeparator={!!dateSep}
                dateSeparatorText={dateSep || undefined}
                isAdmin={isAdmin}
                userId={user?.id}
                onReply={handleReply}
                onReact={reactToMessage}
                onPin={pinMessage}
                onEdit={editMessage}
                onDelete={deleteMessage}
                onRecall={recallMessage}
              />
            );
          })
        )}

        {currentTypingUsers.length > 0 && <TypingIndicator users={currentTypingUsers} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to bottom button */}
      {showScrollDown && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
          <button onClick={() => scrollToBottom('smooth')}
            className="w-9 h-9 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110">
            <ArrowDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Moderation Warning Banner */}
      {moderationWarning && (
        <div className={`px-4 py-3 border-y animate-in slide-in-from-top duration-300 ${moderationWarning.isBlocked ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
          <div className="flex items-start gap-3">
            <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${moderationWarning.isBlocked ? 'text-red-500' : 'text-yellow-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${moderationWarning.isBlocked ? 'text-red-800' : 'text-yellow-800'}`}>
                {moderationWarning.isBlocked ? 'Tin nhắn bị chặn' : 'Cảnh báo'}
              </p>
              <p className={`text-xs mt-0.5 ${moderationWarning.isBlocked ? 'text-red-600' : 'text-yellow-600'}`}>
                {moderationWarning.message}
              </p>
            </div>
            <button onClick={clearModerationWarning} className="p-1 rounded-full hover:bg-black/5"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Dispute/Resolution Banners */}
      {currentConversation?.status === 'DISPUTED' && (
        <div className="px-4 py-2 bg-yellow-50 border-y border-yellow-200 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Tranh chấp đang được xử lý bởi admin</span>
          {currentConversation.disputeReason && (
            <span className="text-xs text-yellow-600 ml-1">— {currentConversation.disputeReason}</span>
          )}
        </div>
      )}

      {currentConversation?.status === 'RESOLVED' && (
        <div className="px-4 py-3 bg-green-50 border-y border-green-200 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-green-800 font-medium">Tranh chấp đã được giải quyết</span>
                {currentConversation.resolution && <p className="text-green-700 text-xs mt-0.5">{currentConversation.resolution}</p>}
              </div>
            </div>
            {(() => {
              const isBuyer = currentConversation.buyerId === user?.id;
              const hasCompleted = isBuyer ? currentConversation.buyerCompleted : currentConversation.sellerCompleted;
              const otherCompleted = isBuyer ? currentConversation.sellerCompleted : currentConversation.buyerCompleted;
              if (hasCompleted) return <span className="text-xs text-green-600 flex-shrink-0">✓ Bạn đã xác nhận {otherCompleted ? '' : '(chờ bên kia)'}</span>;
              return (
                <button onClick={async () => { setIsMarking(true); try { await markConversationComplete(); } finally { setIsMarking(false); } }}
                  disabled={isMarking}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex-shrink-0">
                  {isMarking ? 'Đang xử lý...' : 'Đánh dấu hoàn tất'}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {currentConversation?.status === 'ARCHIVED' && currentConversation.completedAt && (
        <div className="px-4 py-2 bg-gray-50 border-y border-gray-200 flex items-center gap-2 flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Cuộc hội thoại đã được đóng</span>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-blue-50/50 border-t border-blue-100 flex items-center gap-2 flex-shrink-0 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-1 h-8 bg-blue-400 rounded-full flex-shrink-0" />
          <CornerUpLeft className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-blue-600 block">{replyTo.senderName}</span>
            <span className="text-[11px] text-gray-500 truncate block">{replyTo.content}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5 text-blue-400" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2 sm:p-3 border-t bg-white flex-shrink-0">
        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mb-2 flex gap-1.5 flex-wrap">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative group">
                <img src={preview} alt={`Preview ${idx + 1}`} className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200" />
                <button onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File previews */}
        {selectedFiles.length > 0 && (
          <div className="mb-2 flex gap-1.5 flex-wrap">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="relative group flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 pr-8 border border-gray-100">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => handleRemoveFile(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick replies (seller only) */}
        {isSeller && showQuickReplies && (
          <div className="mb-2 flex gap-1.5 flex-wrap animate-in slide-in-from-bottom-2 duration-200">
            {QUICK_REPLIES.map((qr, idx) => (
              <button key={idx} onClick={() => handleQuickReply(qr.text)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[12px] font-medium rounded-full hover:bg-blue-100 transition-colors border border-blue-100">
                {qr.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          <input ref={docFileInputRef} type="file" accept=".txt,.pdf,.doc,.docx,.zip" multiple onChange={handleDocFileSelect} className="hidden" />

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => docFileInputRef.current?.click()} disabled={isSending || selectedFiles.length >= 3}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Đính kèm file">
              <Paperclip className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isSending || selectedImages.length >= 5}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Đính kèm ảnh">
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </button>

            {/* Emoji picker */}
            <div className="relative" ref={emojiPickerRef}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Emoji">
                <Smile className="w-5 h-5 text-gray-400" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-10 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-[280px] animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button key={emoji} onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); inputRef.current?.focus(); }}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg hover:scale-110 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick reply button (seller only) */}
            {isSeller && (
              <button onClick={() => setShowQuickReplies(!showQuickReplies)}
                className={`p-1.5 rounded-lg transition-colors ${showQuickReplies ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'}`}
                title="Trả lời nhanh">
                <Zap className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            placeholder={selectedImages.length > 0 ? "Thêm chú thích..." : selectedFiles.length > 0 ? "Thêm ghi chú..." : "Nhập tin nhắn..."}
            className="flex-1 resize-none overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all disabled:opacity-50"
            disabled={isSending}
            rows={1}
            style={{ maxHeight: '120px', minHeight: '38px' }}
          />

          {/* Send button */}
          <Button onClick={handleSend}
            disabled={(!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0) || isSending}
            size="icon"
            className="shrink-0 h-9 w-9 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-sm">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {isUploading && (
          <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Đang tải lên...
          </div>
        )}

        {currentConversation && currentConversation.status === 'ACTIVE' && (
          <div className="mt-1.5 flex justify-end">
            <button onClick={() => setShowDisputeModal(true)} className="text-[11px] text-red-400 hover:text-red-600 transition-colors">
              Báo cáo / Mở tranh chấp
            </button>
          </div>
        )}
      </div>

      {/* Error Modal */}
      {sendError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSendError(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi gửi tin nhắn</h3>
              <p className="text-gray-600 mb-5">{sendError}</p>
              <Button className="w-full" onClick={() => setSendError(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
