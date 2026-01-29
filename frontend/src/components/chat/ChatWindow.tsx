'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Image as ImageIcon, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat, Message } from '@/hooks/useChat';
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

export function ChatWindow({
  conversationId: initialConversationId,
  sellerId,
  sellerName,
  productId,
  productTitle,
  isWidget = false,
  chatHook: providedChatHook,
}: ChatWindowProps) {
  const { user } = useAuthStore();
  // Use provided chatHook or create new one for widget mode
  const localChatHook = useChat();
  const chatHook = providedChatHook || localChatHook;
  
  const {
    isConnected,
    connectionError,
    currentConversation,
    messages,
    typingUsers,
    isLoading,
    hasMoreMessages,
    loadConversation,
    loadMessages,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    startConversationWithSeller,
    openDispute,
  } = chatHook;

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize conversation
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
      loadMessages(initialConversationId);
    } else if (sellerId) {
      // Start new conversation with seller
      startConversationWithSeller(sellerId, productId, productTitle ? `Hỏi về: ${productTitle}` : undefined)
        .then((conv) => {
          loadMessages(conv._id);
        })
        .catch(console.error);
    }
  }, [initialConversationId, sellerId, productId]);

  // Auto scroll to bottom on new messages
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Scroll the messages container, NOT the entire page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  
  useEffect(() => {
    // Skip scroll on initial load
    if (isInitialLoadRef.current && messages.length > 0) {
      prevMessageCountRef.current = messages.length;
      isInitialLoadRef.current = false;
      // Scroll to bottom immediately on first load
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
      return;
    }
    
    // Only scroll if messages were added (new message arrived)
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom('smooth');
    }
    
    prevMessageCountRef.current = messages.length;
  }, [messages]);
  
  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessageCountRef.current = 0;
  }, [currentConversation?._id]);

  // Mark as read when viewing
  useEffect(() => {
    if (currentConversation) {
      markAsRead();
    }
  }, [currentConversation, messages.length]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Start typing indicator
    startTyping();
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    // Limit to 5 images
    const newImages = [...selectedImages, ...imageFiles].slice(0, 5);
    setSelectedImages(newImages);
    
    // Generate previews
    const newPreviews: string[] = [];
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste images (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;
    
    e.preventDefault();
    
    const files: File[] = [];
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    
    if (files.length === 0) return;
    
    // Limit to 5 images total
    const newImages = [...selectedImages, ...files].slice(0, 5);
    setSelectedImages(newImages);
    
    // Generate previews
    const newPreviews: string[] = [];
    newImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newImages.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove selected image
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload images
  const uploadImages = async (): Promise<any[]> => {
    if (selectedImages.length === 0) return [];
    
    const formData = new FormData();
    selectedImages.forEach(file => {
      formData.append('files', file);
    });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      return data.attachments || [];
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Send message (with or without images)
  const handleSend = async () => {
    if ((!inputValue.trim() && selectedImages.length === 0) || isSending) return;
    
    setIsSending(true);
    setIsUploading(true);
    stopTyping();
    
    try {
      let attachments: any[] = [];
      
      // Upload images if any
      if (selectedImages.length > 0) {
        attachments = await uploadImages();
      }
      
      // Send message
      if (attachments.length > 0) {
        // Send as IMAGE message
        await sendMessage(inputValue.trim() || '', 'IMAGE', attachments);
      } else {
        // Send as TEXT message
        await sendMessage(inputValue.trim());
      }
      
      // Clear input and images
      setInputValue('');
      setSelectedImages([]);
      setImagePreviews([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Send message error:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Load more messages
  const handleLoadMore = () => {
    if (currentConversation && hasMoreMessages && !isLoading) {
      loadMessages(currentConversation._id, true);
    }
  };

  // Get typing users in current conversation
  const currentTypingUsers = typingUsers.filter(
    (u) => u.conversationId === currentConversation?._id && u.userId !== user?.id
  );

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Đang kết nối realtime...</p>
        {connectionError && (
          <p className="text-xs text-red-600 mt-2 max-w-sm">
            Lỗi: {connectionError}. Kiểm tra NEXT_PUBLIC_SOCKET_URL và CORS_ORIGIN.
          </p>
        )}
      </div>
    );
  }


  return (
    <div className={`flex flex-col ${isWidget ? 'h-[calc(500px-56px)]' : 'h-full'}`}>
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tải thêm tin nhắn'}
            </Button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Bắt đầu cuộc trò chuyện</p>
            {productTitle && (
              <p className="text-sm mt-2">Về sản phẩm: {productTitle}</p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.senderId === user?.id}
            />
          ))
        )}

        {/* Typing indicator */}
        {currentTypingUsers.length > 0 && (
          <TypingIndicator users={currentTypingUsers} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Dispute Banner */}
      {currentConversation?.status === 'DISPUTED' && (
        <div className="px-4 py-2 bg-yellow-50 border-y border-yellow-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            Tranh chấp đang được xử lý bởi admin
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t bg-gray-50">
        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {selectedImages.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary transition-colors"
              >
                <ImageIcon className="w-6 h-6 text-gray-400" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isSending || selectedImages.length >= 5}
            title="Đính kèm hình ảnh"
          >
            <ImageIcon className="w-5 h-5 text-gray-500" />
          </button>

          {/* Input */}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onPaste={handlePaste}
            placeholder={selectedImages.length > 0 ? "Thêm chú thích (không bắt buộc)..." : "Nhập tin nhắn hoặc dán hình ảnh (Ctrl+V)..."}
            className="flex-1"
            disabled={isSending}
          />

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && selectedImages.length === 0) || isSending}
            size="icon"
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tải lên hình ảnh...
          </div>
        )}

        {/* Actions */}
        {currentConversation && currentConversation.status === 'ACTIVE' && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setShowDisputeModal(true)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Báo cáo / Mở tranh chấp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
