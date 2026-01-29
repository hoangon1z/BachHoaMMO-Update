'use client';

import { useState } from 'react';
import { Check, CheckCheck, Download, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';
import { Message } from '@/hooks/useChat';
import { API_BASE_URL } from '@/lib/config';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

// Helper to get full URL for attachments
const getFullUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [imageError, setImageError] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // System message
  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 text-xs px-4 py-2 rounded-full max-w-[80%] text-center">
          {message.content}
        </div>
      </div>
    );
  }

  // Hidden message (admin moderation)
  if (message.isHidden) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="bg-gray-100 text-gray-400 text-sm px-4 py-2 rounded-xl italic flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Tin nhắn đã bị ẩn
        </div>
      </div>
    );
  }

  // Product embed
  if (message.type === 'PRODUCT' && message.productEmbed) {
    const { productEmbed } = message;
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
          {/* Sender info for received messages */}
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              {message.senderAvatar ? (
                <img
                  src={getFullUrl(message.senderAvatar)}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium">{message.senderName?.[0]}</span>
                </div>
              )}
              <span className="text-xs text-gray-500">{message.senderName}</span>
            </div>
          )}

          {/* Product card */}
          <a
            href={`/products/${productEmbed.productId}`}
            target="_blank"
            className="block bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="flex">
              <img
                src={productEmbed.image}
                alt=""
                className="w-20 h-20 object-cover"
              />
              <div className="flex-1 p-3">
                <p className="font-medium text-sm line-clamp-2">{productEmbed.title}</p>
                <p className="text-primary font-bold mt-1">
                  {productEmbed.price.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>
          </a>

          {/* Time */}
          <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
        {/* Sender info for received messages */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            {message.senderAvatar ? (
              <img
                src={getFullUrl(message.senderAvatar)}
                alt=""
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium">{message.senderName?.[0]}</span>
              </div>
            )}
            <span className="text-xs font-semibold text-gray-700">{message.senderName}</span>
            {message.senderRole === 'ADMIN' && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Admin</span>
            )}
            {message.senderRole === 'SELLER' && (
              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Seller</span>
            )}
            <span className="text-xs text-gray-400">• {formatDate(message.createdAt)}</span>
          </div>
        )}

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {/* Text content */}
          {(message.type === 'TEXT' || !message.type) && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Image attachments */}
          {message.type === 'IMAGE' && message.attachments && (
            <div className="space-y-2">
              {message.attachments.map((att, idx) => {
                const fullUrl = getFullUrl(att.url);
                return (
                  <div key={idx} className="relative">
                    {!imageError ? (
                      <img
                        src={fullUrl}
                        alt={att.name}
                        className="max-w-full rounded-lg cursor-pointer"
                        onClick={() => window.open(fullUrl, '_blank')}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm opacity-75">
                        <ImageIcon className="w-4 h-4" />
                        <span>Không thể tải ảnh</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {message.content && (
                <p className="whitespace-pre-wrap break-words mt-2">{message.content}</p>
              )}
            </div>
          )}

          {/* File attachments */}
          {message.type === 'FILE' && message.attachments && (
            <div className="space-y-2">
              {message.attachments.map((att, idx) => {
                const fullUrl = getFullUrl(att.url);
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    download={att.name}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-200 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    <FileText className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs opacity-75">
                        {(att.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Download className="w-4 h-4" />
                  </a>
                );
              })}
              {message.content && (
                <p className="whitespace-pre-wrap break-words mt-2">{message.content}</p>
              )}
            </div>
          )}
        </div>

        {/* Time and read status */}
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400" title={formatDate(message.createdAt)}>
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <>
              {message.senderRole === 'ADMIN' && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Admin</span>
              )}
              {message.senderRole === 'SELLER' && (
                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">Seller</span>
              )}
              <span className="text-xs">
                {message.readBy && message.readBy.length > 0 ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : (
                  <Check className="w-4 h-4 text-gray-400" />
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
