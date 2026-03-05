'use client';

import Link from 'next/link';
import { Star, Package } from 'lucide-react';
import { useState } from 'react';
import { VerifyBadge } from './VerifyBadge';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}

interface ProductCardProps {
  product: {
    id: string;
    slug?: string;
    title: string;
    price: number;
    originalPrice?: number;
    minPrice?: number;
    maxPrice?: number;
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
        isVerified?: boolean;
        insuranceLevel?: number;
        insuranceTier?: string;
        contactPhone?: string;
        contactTelegram?: string;
        withdrawalPin?: string;
      };
    };
    rating: number;
    sales: number;
    views?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [sellerImgError, setSellerImgError] = useState(false);

  let images: string[] = [];
  try {
    images = JSON.parse(product.images || '[]');
  } catch {
    images = [];
  }
  const thumbnail = getImageUrl(images[0] || product.thumbnail || '');

  const hasPriceRange = product.minPrice && product.maxPrice && product.minPrice !== product.maxPrice;
  const discount = !hasPriceRange && product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  const formatSales = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const productUrl = `/products/${product.slug || product.id}`;
  const shopName = product.seller?.sellerProfile?.shopName || product.seller?.name || '';
  const isVerified = product.seller?.sellerProfile?.isVerified || false;
  const insuranceLevel = product.seller?.sellerProfile?.insuranceLevel || 0;
  const insuranceTier = product.seller?.sellerProfile?.insuranceTier || null;
  const sp = product.seller?.sellerProfile;
  const shopLogo = sp?.shopLogo || product.seller?.avatar;
  const shopLogoUrl = shopLogo ? getImageUrl(shopLogo) : null;

  return (
    <Link href={productUrl} className="block group">
      <article className="bg-white rounded-lg border border-gray-100 group-hover:border-blue-200 group-hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-250">

        {/* ── Image ── */}
        <div className="relative bg-gray-50 rounded-t-lg overflow-hidden" style={{ paddingTop: '100%' }}>
          {thumbnail && !imageError ? (
            <img
              src={thumbnail}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-200" />
            </div>
          )}

          {/* Discount tag */}
          {discount > 0 && (
            <div className="absolute top-2 left-2">
              <span className="inline-block bg-red-500 text-white text-[10px] font-semibold px-1.5 py-[2px] rounded leading-tight">
                -{discount}%
              </span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="px-2.5 pt-2 pb-2.5">
          {/* Title */}
          <h3 className="text-[13px] leading-[1.4] text-gray-800 font-medium line-clamp-2 min-h-[36px] mb-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-2.5">
            {hasPriceRange ? (
              <span className="text-[15px] font-bold text-[#ee4d2d]">
                {formatPrice(product.minPrice!)} - {formatPrice(product.maxPrice!)}
              </span>
            ) : (
              <>
                <span className="text-[15px] font-bold text-[#ee4d2d]">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[11px] text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Rating + Sales row */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700">{(product.rating || 0).toFixed(1)}</span>
            </div>
            <span className="text-[11px] text-gray-400">•</span>
            <span className="text-[11px] text-gray-500 font-medium">Đã bán {formatSales(product.sales || 0)}</span>
          </div>

          {/* Shop row */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
            {shopLogoUrl && !sellerImgError ? (
              <img
                src={shopLogoUrl}
                alt={shopName}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0 ring-1 ring-gray-200"
                onError={() => setSellerImgError(true)}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[8px] font-bold text-white">{shopName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="text-[11px] text-gray-600 font-medium truncate flex-1">{shopName}</span>
            {(isVerified || insuranceLevel > 0) && <VerifyBadge size={18} isVerified={isVerified} insuranceLevel={insuranceLevel} insuranceTier={insuranceTier} />}
          </div>
        </div>
      </article>
    </Link>
  );
}
