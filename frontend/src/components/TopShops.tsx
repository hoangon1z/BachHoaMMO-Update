'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Star, ShoppingBag, ChevronRight, Gavel, Crown, Medal, Award, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinnedProduct {
  id: string;
  title: string;
  price: number;
  images: string;
  slug?: string;
}

interface AuctionWinner {
  position: number;
  sellerId: string;
  shopName: string;
  shopLogo?: string;
  shopDescription?: string;
  rating: number;
  totalSales: number;
  insuranceLevel?: number;
  insuranceTier?: string | null;
  amount: number;
  pinnedProducts?: PinnedProduct[];
}

interface TopShopsProps {
  winners: AuctionWinner[];
}

export function TopShops({ winners }: TopShopsProps) {
  if (winners.length === 0) return null;

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return {
          icon: Crown,
          label: 'TOP 1',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconColor: 'text-amber-500',
          badgeBg: 'bg-amber-100',
          badgeText: 'text-amber-800',
          badgeBorder: 'border-amber-200',
          avatarRing: 'ring-amber-300',
          hoverShadow: 'hover:shadow-amber-100',
        };
      case 2:
        return {
          icon: Medal,
          label: 'TOP 2',
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          iconColor: 'text-slate-500',
          badgeBg: 'bg-slate-100',
          badgeText: 'text-slate-700',
          badgeBorder: 'border-slate-200',
          avatarRing: 'ring-slate-300',
          hoverShadow: 'hover:shadow-slate-100',
        };
      case 3:
        return {
          icon: Award,
          label: 'TOP 3',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconColor: 'text-orange-500',
          badgeBg: 'bg-orange-100',
          badgeText: 'text-orange-800',
          badgeBorder: 'border-orange-200',
          avatarRing: 'ring-orange-300',
          hoverShadow: 'hover:shadow-orange-100',
        };
      default:
        return {
          icon: Award,
          label: `TOP ${position}`,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          iconColor: 'text-gray-500',
          badgeBg: 'bg-gray-100',
          badgeText: 'text-gray-700',
          badgeBorder: 'border-gray-200',
          avatarRing: 'ring-gray-300',
          hoverShadow: 'hover:shadow-gray-100',
        };
    }
  };

  const formatSales = (sales: number) => {
    if (sales >= 1000) {
      return `${(sales / 1000).toFixed(1)}K`;
    }
    return sales.toString();
  };

  // Insurance tier display
  const getTierInfo = (tier?: string | null) => {
    const tiers: Record<string, { label: string; color: string }> = {
      BRONZE: { label: 'Bronze', color: 'text-amber-700 bg-amber-50 border-amber-200' },
      SILVER: { label: 'Silver', color: 'text-slate-600 bg-slate-50 border-slate-200' },
      GOLD: { label: 'Gold', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
      DIAMOND: { label: 'Diamond', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
      VIP: { label: 'VIP', color: 'text-violet-700 bg-violet-50 border-violet-200' },
    };
    return tier ? tiers[tier] || null : null;
  };

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Gian hàng nổi bật hôm nay</h2>
            <p className="text-xs text-gray-400">Được bình chọn qua đấu giá hàng ngày</p>
          </div>
        </div>
        <Link href="/auction">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Gavel className="w-3.5 h-3.5" />
            Xem đấu giá
            <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Winners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.map((winner) => {
          const style = getPositionStyle(winner.position);
          const PositionIcon = style.icon;
          const tierInfo = getTierInfo(winner.insuranceTier);
          const shopLogoUrl = winner.shopLogo?.startsWith('http')
            ? winner.shopLogo
            : winner.shopLogo
              ? `${backendUrl}${winner.shopLogo}`
              : null;

          return (
            <Link key={winner.sellerId} href={`/shop/${winner.sellerId}`}>
              <div className={`relative bg-white rounded-xl border ${style.border} overflow-hidden ${style.hoverShadow} hover:shadow-lg transition-all duration-300 group`}>
                {/* Position Badge — uses Lucide icon, no emoji */}
                <div className={`absolute top-3 right-3 z-10 ${style.badgeBg} border ${style.badgeBorder} ${style.badgeText} px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5`}>
                  <PositionIcon className="w-3.5 h-3.5" />
                  <span>{style.label}</span>
                </div>

                {/* Header — subtle background, no heavy gradient */}
                <div className={`h-14 ${style.bg}`} />

                {/* Shop Info */}
                <div className="px-4 pb-4 -mt-7 relative">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-full bg-white border-3 border-white shadow-md overflow-hidden ring-2 ${style.avatarRing} mx-auto`}>
                    {shopLogoUrl ? (
                      <Image
                        src={shopLogoUrl}
                        alt={winner.shopName}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full ${style.bg} flex items-center justify-center ${style.iconColor} text-lg font-bold`}>
                        {winner.shopName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + Insurance badge */}
                  <div className="text-center mt-2.5">
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-primary transition-colors">
                      {winner.shopName}
                    </h3>
                    {tierInfo && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${tierInfo.color}`}>
                        <Shield className="w-2.5 h-2.5" />
                        {tierInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {winner.shopDescription && (
                    <p className="text-center text-xs text-gray-400 mt-1.5 line-clamp-2">
                      {winner.shopDescription}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-gray-700">{winner.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{formatSales(winner.totalSales)} đã bán</span>
                    </div>
                  </div>

                  {/* Visit Button */}
                  <div className="mt-3">
                    <Button variant="outline" size="sm" className="w-full text-xs h-8 group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900 transition-colors">
                      Xem gian hàng
                    </Button>
                  </div>

                  {/* Pinned Products */}
                  {winner.pinnedProducts && winner.pinnedProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">Sản phẩm nổi bật</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {winner.pinnedProducts.slice(0, 4).map(product => {
                          const productImages = (() => {
                            try { return JSON.parse(product.images); } catch { return []; }
                          })();
                          const imgSrc = productImages[0]
                            ? (productImages[0].startsWith('http') ? productImages[0] : `${backendUrl}${productImages[0]}`)
                            : null;
                          return (
                            <Link key={product.id} href={`/products/${product.slug || product.id}`} onClick={e => e.stopPropagation()}>
                              <div className="bg-gray-50 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
                                {imgSrc && (
                                  <div className="w-full aspect-square rounded overflow-hidden mb-1">
                                    <Image src={imgSrc} alt={product.title} width={80} height={80} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-700 font-medium line-clamp-1">{product.title}</p>
                                <p className="text-[10px] text-amber-600 font-bold">{product.price.toLocaleString('vi-VN')}đ</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
