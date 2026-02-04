'use client';

import Link from 'next/link';
import { Star, ShoppingCart, Heart, Package } from 'lucide-react';
import { useState } from 'react';
import { VerifyBadge } from './VerifyBadge';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Helper to get full image URL
function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}

// Seller Avatar component with fallback
function SellerAvatar({ shopLogo, avatar, shopName }: { shopLogo?: string; avatar?: string; shopName: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = shopLogo || avatar;
  const fullLogoUrl = logoUrl ? getImageUrl(logoUrl) : null;
  
  return (
    <div className="flex items-center gap-1 mb-2 min-w-0">
      {fullLogoUrl && !imgError ? (
        <img 
          src={fullLogoUrl} 
          alt={shopName}
          className="w-4 h-4 rounded-full object-cover flex-shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-4 h-4 rounded-full bg-[#2563eb] flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-white">
            {shopName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className="text-[11px] text-gray-500 truncate max-w-[60%]">
        {shopName}
      </span>
      <VerifyBadge size={20} />
    </div>
  );
}

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    minPrice?: number;  // Giá thấp nhất (khi có variants)
    maxPrice?: number;  // Giá cao nhất (khi có variants)
    hasVariants?: boolean;
    thumbnail?: string;
    images: string;
    seller: {
      name: string;
      avatar?: string;
      sellerProfile?: {
        shopName: string;
        shopLogo?: string;
        rating: number;
      };
    };
    rating: number;
    sales: number;
    views?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  let images: string[] = [];
  try {
    images = JSON.parse(product.images || '[]');
  } catch {
    images = [];
  }
  const thumbnail = getImageUrl(images[0] || product.thumbnail || '');
  
  // Có price range? (nhiều phân loại với giá khác nhau)
  const hasPriceRange = product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice;
  
  // Giá bán (price) = khách trả, giá gốc (originalPrice) = gạch ngang. Giảm % khi originalPrice > price
  // Không hiển thị discount khi có price range
  const discount = !hasPriceRange && product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div 
        className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {/* Product Image or Placeholder */}
          {thumbnail && !imageError ? (
            <img 
              src={thumbnail} 
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#2563eb] flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
          
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg shadow-md">
              -{discount}%
            </div>
          )}
          
          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={`absolute top-2 right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
              isWishlisted 
                ? 'bg-red-500 text-white' 
                : 'bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-red-500'
            } shadow-md`}
          >
            <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          
          {/* Quick Actions Overlay - Hidden on mobile */}
          <div className={`hidden sm:block absolute inset-x-0 bottom-0 p-3 bg-black/50 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}>
            <button className="w-full py-2.5 bg-white hover:bg-blue-600 hover:text-white text-gray-900 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Thêm vào giỏ
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-2.5 sm:p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-2 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors min-h-[2rem] sm:min-h-[2.5rem]">
            {product.title}
          </h3>
          
          {/* Stats Row - Simplified for mobile */}
          <div className="flex items-center gap-2 mb-2 text-[10px] sm:text-xs">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">{product.rating.toFixed(1)}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 truncate">Đã bán {product.sales}</span>
          </div>
          
          {/* Seller */}
          <SellerAvatar 
            shopLogo={product.seller.sellerProfile?.shopLogo}
            avatar={product.seller.avatar}
            shopName={product.seller.sellerProfile?.shopName || product.seller.name}
          />
          
          {/* Price */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {/* Hiển thị price range khi có nhiều phân loại với giá khác nhau */}
            {product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice ? (
              <span className="text-sm sm:text-lg font-bold text-blue-600">
                {formatPrice(product.minPrice)} - {formatPrice(product.maxPrice)}
              </span>
            ) : product.originalPrice && product.originalPrice > product.price ? (
              <>
                <span className="text-sm sm:text-lg font-bold text-red-500">
                  {formatPrice(product.price)}
                </span>
                <span className="text-[10px] sm:text-sm text-gray-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-lg font-bold text-blue-600">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
