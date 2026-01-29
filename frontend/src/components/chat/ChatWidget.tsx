'use client';

import { useState } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatWindow } from './ChatWindow';
import { useAuthStore } from '@/store/authStore';

interface ChatWidgetProps {
  sellerId?: string;
  sellerName?: string;
  productId?: string;
  productTitle?: string;
}

/**
 * Floating chat widget for product pages
 */
export function ChatWidget({ sellerId, sellerName, productId, productTitle }: ChatWidgetProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!user || user.role === 'ADMIN') return null;
  if (user.id === sellerId) return null; // Don't show chat for own products

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border overflow-hidden transition-all ${
            isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="h-14 bg-primary text-white px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">
                {sellerName ? `Chat với ${sellerName}` : 'Tin nhắn'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <ChatWindow
              sellerId={sellerId}
              sellerName={sellerName}
              productId={productId}
              productTitle={productTitle}
              isWidget={true}
            />
          )}
        </div>
      )}
    </>
  );
}
