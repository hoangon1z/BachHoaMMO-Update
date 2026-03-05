'use client';

import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { ArrowRight, Crown, Medal } from 'lucide-react';

interface AuctionWinnerWithProducts {
  position: number;
  shopName: string;
  shopLogo?: string;
  pinnedProducts?: any[];
}

interface FeaturedProductsProps {
  products: any[];
  title: string;
  auctionWinners?: AuctionWinnerWithProducts[];
  viewAllHref?: string;
}

const POSITION_CONFIGS = [
  { label: 'TOP 1', icon: Crown, bgClass: 'bg-gradient-to-r from-amber-500 to-yellow-400' },
  { label: 'TOP 2', icon: Medal, bgClass: 'bg-gradient-to-r from-slate-400 to-slate-300' },
  { label: 'TOP 3', icon: Medal, bgClass: 'bg-gradient-to-r from-amber-700 to-amber-600' },
];

export function FeaturedProducts({ products, title, auctionWinners = [], viewAllHref = '/explore' }: FeaturedProductsProps) {
  // Collect all pinned products from winners, sorted by position (TOP 1 first)
  const pinnedItems: { product: any; position: number; shopName: string }[] = [];
  const sortedWinners = [...auctionWinners].sort((a, b) => a.position - b.position);
  const seenPinnedIds = new Set<string>();

  for (const winner of sortedWinners) {
    for (const product of (winner.pinnedProducts || [])) {
      if (seenPinnedIds.has(product.id)) continue;
      seenPinnedIds.add(product.id);
      pinnedItems.push({
        product,
        position: winner.position,
        shopName: winner.shopName,
      });
    }
  }

  // Deduplicate: remove pinned product IDs from regular list
  const pinnedIds = new Set(pinnedItems.map(p => p.product.id));
  const allRegular = products.filter(p => !pinnedIds.has(p.id));

  // Only show 1 row: 5 items total (pinned + regular)
  const MAX_ITEMS = 5;
  const regularCount = Math.max(0, MAX_ITEMS - pinnedItems.length);
  const regularProducts = allRegular.slice(0, regularCount);

  // All items combined for display
  const allItems = [
    ...pinnedItems.map(p => ({ ...p, isPinned: true })),
    ...regularProducts.map(p => ({ product: p, position: 0, shopName: '', isPinned: false })),
  ];

  if (allItems.length === 0) return null;

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors group"
        >
          Xem tất cả
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 1 Row - Horizontal scroll on mobile, fixed 5 cols on desktop */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {allItems.map(({ product, position, isPinned }) => (
          <div
            key={isPinned ? `pinned-${product.id}` : product.id}
            className="relative flex-shrink-0 w-[46%] sm:w-[32%] lg:w-[24%] xl:w-[19.2%] snap-start"
          >
            {/* TOP badge for pinned products */}
            {isPinned && position > 0 && (() => {
              const tag = POSITION_CONFIGS[position - 1] || POSITION_CONFIGS[2];
              const TagIcon = tag.icon;
              return (
                <div className="absolute top-2 left-2 z-20">
                  <span className={`inline-flex items-center gap-0.5 ${tag.bgClass} text-white text-[10px] font-bold px-1.5 py-[2px] rounded leading-tight shadow-sm`}>
                    <TagIcon className="w-2.5 h-2.5" />
                    {tag.label}
                  </span>
                </div>
              );
            })()}
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
