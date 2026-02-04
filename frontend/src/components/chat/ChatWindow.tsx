'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Image as ImageIcon, X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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
    markConversationComplete,
  } = chatHook;

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, sellerId, productId]);

  // Auto-focus input when conversation is ready
  useEffect(() => {
    if (currentConversation && !isLoading) {
      // Delay focus to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentConversation?._id, isLoading]);

  // Auto-focus on mount when conversation ID is provided
  useEffect(() => {
    if (initialConversationId || sellerId) {
      // Focus after a short delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialConversationId, sellerId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?._id, messages.length]);

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
      
      // Focus input after state updates complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Send message error:', error);
      setSendError('Không thể gửi tin nhắn. Vui lòng thử lại!');
      // Focus input even on error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
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
    <div className={`flex flex-col ${isWidget ? 'h-[calc(500px-56px)]' : 'h-full'} min-h-0 overflow-hidden`}>
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 min-h-0">
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

      {/* Resolution Banner - Show when dispute is resolved but not yet completed by both parties */}
      {currentConversation?.status === 'RESOLVED' && (
        <div className="px-4 py-3 bg-green-50 border-y border-green-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="text-green-800 font-medium">Tranh chấp đã được giải quyết</span>
                {currentConversation.resolution && (
                  <p className="text-green-700 text-xs mt-0.5">{currentConversation.resolution}</p>
                )}
              </div>
            </div>
            {(() => {
              const isBuyer = currentConversation.buyerId === user?.id;
              const isSeller = currentConversation.sellerId === user?.id;
              const hasCompleted = isBuyer ? currentConversation.buyerCompleted : currentConversation.sellerCompleted;
              const otherCompleted = isBuyer ? currentConversation.sellerCompleted : currentConversation.buyerCompleted;
              
              if (hasCompleted) {
                return (
                  <span className="text-xs text-green-600 flex-shrink-0">
                    ✓ Bạn đã xác nhận {otherCompleted ? '' : '(chờ bên kia)'}
                  </span>
                );
              }
              
              return (
                <button
                  onClick={async () => {
                    setIsMarking(true);
                    try {
                      await markConversationComplete();
                    } finally {
                      setIsMarking(false);
                    }
                  }}
                  disabled={isMarking}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {isMarking ? 'Đang xử lý...' : 'Đánh dấu hoàn tất'}
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Archived/Completed Banner */}
      {currentConversation?.status === 'ARCHIVED' && currentConversation.completedAt && (
        <div className="px-4 py-2 bg-gray-50 border-y border-gray-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            Cuộc hội thoại đã được đóng
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2 sm:p-3 border-t bg-gray-50 flex-shrink-0">
        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="mb-2 sm:mb-3 flex gap-1.5 sm:gap-2 flex-wrap">
            {imagePreviews.map((preview, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-14 h-14 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}
            {selectedImages.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 sm:w-20 sm:h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary transition-colors"
              >
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2">
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
            className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
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
            placeholder={selectedImages.length > 0 ? "Thêm chú thích..." : "Nhập tin nhắn..."}
            className="flex-1"
            disabled={isSending}
          />

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={(!inputValue.trim() && selectedImages.length === 0) || isSending}
            size="icon"
            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
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
          <div className="mt-1.5 sm:mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tải lên hình ảnh...
          </div>
        )}

        {/* Actions */}
        {currentConversation && currentConversation.status === 'ACTIVE' && (
          <div className="mt-1.5 sm:mt-2 flex justify-end">
            <button
              onClick={() => setShowDisputeModal(true)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Báo cáo / Mở tranh chấp
            </button>
          </div>
        )}
      </div>

      {/* Error Modal */}
      {sendError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSendError(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi gửi tin nhắn</h3>
              <p className="text-gray-600 mb-5">{sendError}</p>
              <Button 
                className="w-full"
                onClick={() => setSendError(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
