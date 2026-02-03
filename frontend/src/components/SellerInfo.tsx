'use client';

import { Store, Star, Package, Clock, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface Seller {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  totalSales: number;
  joinDate: string;
}

interface SellerInfoProps {
  seller: Seller;
  productId?: string;
  productTitle?: string;
}

export function SellerInfo({ seller, productId, productTitle }: SellerInfoProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const joinedMonths = Math.floor(
    (new Date().getTime() - new Date(seller.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const handleChatWithSeller = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Navigate to messages page with seller info
    const params = new URLSearchParams({
      seller: seller.id,
      sellerName: seller.name,
    });
    
    if (productId) params.append('productId', productId);
    if (productTitle) params.append('productTitle', productTitle);
    
    router.push(`/messages?${params.toString()}`);
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Store className="w-5 h-5 text-primary" />
        Thông tin người bán
      </h3>

      {/* Seller Avatar & Name */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
          {seller.avatar ? (
            <img
              src={seller.avatar}
              alt={seller.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <Store className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <div>
          <h4 className="font-semibold">{seller.name}</h4>
          <button
            onClick={() => router.push(`/shop/${seller.id}`)}
            className="text-sm text-primary hover:underline"
          >
            Xem shop
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4" />
            Đánh giá
          </span>
          <span className="font-semibold text-yellow-600">
            {seller.rating}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            Sản phẩm đã bán
          </span>
          <span className="font-semibold">{seller.totalSales.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Tham gia
          </span>
          <span className="font-semibold">{joinedMonths} tháng trước</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push(`/shop/${seller.id}`)}
        >
          <Store className="w-4 h-4 mr-2" />
          Xem shop
        </Button>
        <Button 
          variant="default" 
          className="w-full"
          onClick={handleChatWithSeller}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat với shop
        </Button>
      </div>

      {/* Trust Badge */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            ✓
          </div>
          <span>Người bán uy tín</span>
        </div>
      </div>
    </div>
  );
}
