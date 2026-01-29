'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Star, ShoppingBag, ChevronRight, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuctionWinner {
  position: number;
  sellerId: string;
  shopName: string;
  shopLogo?: string;
  shopDescription?: string;
  rating: number;
  totalSales: number;
  amount: number;
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
          gradient: 'from-yellow-400 via-yellow-500 to-yellow-600',
          icon: '🥇',
          label: 'TOP 1',
          shadow: 'shadow-yellow-200',
          ring: 'ring-yellow-400',
        };
      case 2:
        return {
          gradient: 'from-gray-300 via-gray-400 to-gray-500',
          icon: '🥈',
          label: 'TOP 2',
          shadow: 'shadow-gray-200',
          ring: 'ring-gray-400',
        };
      case 3:
        return {
          gradient: 'from-amber-500 via-amber-600 to-amber-700',
          icon: '🥉',
          label: 'TOP 3',
          shadow: 'shadow-amber-200',
          ring: 'ring-amber-500',
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-600',
          icon: '',
          label: `TOP ${position}`,
          shadow: 'shadow-gray-200',
          ring: 'ring-gray-400',
        };
    }
  };

  const formatSales = (sales: number) => {
    if (sales >= 1000) {
      return `${(sales / 1000).toFixed(1)}K`;
    }
    return sales.toString();
  };

  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Gian hàng nổi bật tuần này</h2>
            <p className="text-sm text-muted-foreground">Được bình chọn qua đấu giá hàng tuần</p>
          </div>
        </div>
        <Link href="/auction">
          <Button variant="outline" size="sm" className="gap-2">
            <Gavel className="w-4 h-4" />
            Xem đấu giá
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Winners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.map((winner) => {
          const style = getPositionStyle(winner.position);
          const shopLogoUrl = winner.shopLogo?.startsWith('http')
            ? winner.shopLogo
            : winner.shopLogo
              ? `${backendUrl}${winner.shopLogo}`
              : null;

          return (
            <Link key={winner.sellerId} href={`/shop/${winner.sellerId}`}>
              <div className={`relative bg-card rounded-xl border overflow-hidden hover:shadow-lg ${style.shadow} transition-all duration-300 group`}>
                {/* Position Badge */}
                <div className={`absolute top-3 right-3 z-10 bg-gradient-to-r ${style.gradient} text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1`}>
                  <span>{style.icon}</span>
                  <span>{style.label}</span>
                </div>

                {/* Header Gradient */}
                <div className={`h-16 bg-gradient-to-r ${style.gradient} opacity-20`} />

                {/* Shop Info */}
                <div className="px-4 pb-4 -mt-8 relative">
                  {/* Avatar */}
                  <div className={`w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden ring-2 ${style.ring} mx-auto`}>
                    {shopLogoUrl ? (
                      <Image
                        src={shopLogoUrl}
                        alt={winner.shopName}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white text-xl font-bold`}>
                        {winner.shopName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-center font-bold mt-3 text-lg group-hover:text-primary transition-colors">
                    {winner.shopName}
                  </h3>

                  {/* Description */}
                  {winner.shopDescription && (
                    <p className="text-center text-sm text-muted-foreground mt-1 line-clamp-2">
                      {winner.shopDescription}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{winner.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ShoppingBag className="w-4 h-4" />
                      <span>{formatSales(winner.totalSales)} đã bán</span>
                    </div>
                  </div>

                  {/* Visit Button */}
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                      Xem gian hàng
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
