'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { normalizeProduct } from '@/lib/utils';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { SupportWidgets } from '@/components/SupportWidgets';
import { Footer } from '@/components/Footer';
import { TopShops } from '@/components/TopShops';
import { ProductCard } from '@/components/ProductCard';
import {
  ArrowRight, Loader2, X, Shield, ChevronRight, ShieldCheck,
  Star, Sparkles, CheckCircle, Info, Send, ExternalLink, Users, Bell,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  link: string;
  gradient?: string;
  discount?: string;
  price?: string;
  originalPrice?: string;
  position: number;
  isActive: boolean;
}

interface CategoryShowcase {
  id: string;
  title: string;
  image: string;
  link: string;
  position: number;
  isActive: boolean;
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
  pinnedProducts?: {
    id: string;
    title: string;
    price: number;
    images: string;
    slug?: string;
    sellerId: string;
  }[];
}

interface HomePageClientProps {
  initialFeaturedProducts: any[];
  initialLatestProducts: any[];
  initialCategories: Category[];
  initialBanners: Banner[];
  initialAuctionWinners?: AuctionWinner[];
  initialCategoryShowcases?: CategoryShowcase[];
  initialBestSellersWeekly?: any[];
  initialTrustedShopProducts?: any[];
}

// ============================================
// INSURANCE ANNOUNCEMENT DIALOG
// ============================================
const INSURANCE_DISMISSED_KEY = 'bhmmo_insurance_announce_dismissed_v1';

function InsuranceAnnouncementDialog({ onClose }: { onClose: () => void }) {
  const tiers = [
    { name: 'Đồng', price: '500.000đ', coverage: '1 triệu/đơn', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { name: 'Bạc', price: '1.000.000đ', coverage: '3 triệu/đơn', color: 'text-slate-600 bg-slate-50 border-slate-200' },
    { name: 'Vàng', price: '2.000.000đ', coverage: '5 triệu/đơn', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    { name: 'Kim Cương', price: '5.000.000đ', coverage: '15 triệu/đơn', color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    { name: 'VIP', price: '10.000.000đ', coverage: '30 triệu/đơn', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Cập nhật hệ thống tích xanh</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cơ chế xác minh mới cho người bán</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* What changed */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Có gì mới?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hệ thống <strong>tích xanh</strong> cũ đã được nâng cấp thành hệ thống <strong>Bảo hiểm Gian hàng</strong>.
              Thay vì chỉ hiển thị badge xác minh đơn giản, giờ đây mỗi seller có thể chọn gói bảo hiểm phù hợp.
            </p>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Lợi ích cho người bán
            </h3>
            <ul className="space-y-1.5">
              {[
                'Badge bảo hiểm nổi bật (5 cấp, animate đẹp)',
                'Buyer tin tưởng hơn → tăng đơn hàng',
                'Giảm giá khởi điểm khi đấu giá TOP (tối đa 25%)',
                'Ưu tiên hiển thị trong kết quả tìm kiếm',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Tiers table */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-500" />
              Các gói bảo hiểm
            </h3>
            <div className="space-y-1.5">
              {tiers.map((tier, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${tier.color}`}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">{tier.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold">{tier.price}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">BH: {tier.coverage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Lưu ý:</strong> Tích xanh cũ vẫn được hiển thị cho đến khi bạn nâng cấp sang gói bảo hiểm mới.
              Bạn có thể đăng ký bất cứ lúc nào tại trang Bảo hiểm Gian hàng.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm">
              Để sau
            </Button>
            <Link href="/seller/insurance" className="flex-1">
              <Button className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700" onClick={onClose}>
                Đăng ký ngay <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TELEGRAM CHANNEL DIALOG
// ============================================
const TELEGRAM_CHANNEL_DISMISSED_KEY = 'bhmmo_telegram_channel_dismissed_v1';

function TelegramChannelDialog({ isSeller, onClose }: { isSeller: boolean; onClose: () => void }) {
  const channels = [
    {
      name: 'BachHoaMMO Channel',
      url: 'https://t.me/bhmmochannel',
      handle: '@bhmmochannel',
      desc: 'Thông báo chung, tin tức, khuyến mãi dành cho tất cả mọi người',
      icon: Users,
      color: 'bg-blue-500',
      forAll: true,
    },
    {
      name: 'Seller Channel',
      url: 'https://t.me/forsellerbhmmo',
      handle: '@forsellerbhmmo',
      desc: 'Thông báo riêng cho người bán: cập nhật tính năng, chính sách, hỗ trợ',
      icon: Bell,
      color: 'bg-emerald-500',
      forAll: false,
    },
  ];

  const visibleChannels = channels.filter(c => c.forAll || isSeller);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Telegram branding */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#0088cc] to-[#229ED9] text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">Tham gia Telegram</h2>
                <p className="text-xs text-white/80 mt-0.5">Nhận thông báo cập nhật nhanh nhất</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tham gia kênh Telegram để nhận thông báo về <strong>tính năng mới</strong>, <strong>cập nhật hệ thống</strong>, và <strong>thông tin quan trọng</strong> ngay lập tức.
          </p>

          {/* Channel List */}
          <div className="space-y-3">
            {visibleChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.url}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#0088cc] hover:bg-blue-50/50 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full ${channel.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-900">{channel.name}</span>
                      <span className="text-xs text-gray-400">{channel.handle}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{channel.desc}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#0088cc] flex-shrink-0 transition-colors" />
                </a>
              );
            })}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Chúng tôi sẽ gửi thông báo qua Telegram khi có <strong>tính năng mới</strong>, <strong>thay đổi chính sách</strong>, hoặc <strong>sự kiện đặc biệt</strong>. Không spam!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-10 text-sm">
              Để sau
            </Button>
            <a href="https://t.me/bhmmochannel" target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full h-10 text-sm font-semibold bg-[#0088cc] hover:bg-[#006da3]" onClick={onClose}>
                <Send className="w-4 h-4 mr-1.5" />
                Tham gia ngay
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LATEST PRODUCTS WITH PAGINATION
// ============================================
function LatestProductsSection({ initialProducts }: { initialProducts: any[] }) {
  const [products, setProducts] = useState<any[]>(initialProducts.map(normalizeProduct));
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/products?page=${nextPage}&limit=10&sortBy=createdAt`);
      const data = await res.json();

      if (data && Array.isArray(data)) {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          const normalized = data.map(normalizeProduct);
          // Deduplicate by id
          setProducts(prev => {
            const existingIds = new Set(prev.map((p: any) => p.id));
            const newProducts = normalized.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...newProducts];
          });
          setPage(nextPage);
          if (data.length < 10) setHasMore(false);
        }
      } else if (data?.products && Array.isArray(data.products)) {
        // Handle paginated response format
        const normalized = data.products.map(normalizeProduct);
        setProducts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const newProducts = normalized.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
        setPage(nextPage);
        if (data.products.length < 10 || (data.total && products.length + data.products.length >= data.total)) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, hasMore, products.length]);

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wide">Sản phẩm mới nhất</h2>
        <Link
          href="/explore?sort=newest"
          className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors group"
        >
          Xem tất cả
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-5">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="h-10 px-8 text-sm font-medium border-gray-200 hover:bg-gray-50 transition-all"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                Xem thêm sản phẩm
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN HOME PAGE CLIENT
// ============================================
export default function HomePageClient({
  initialFeaturedProducts,
  initialLatestProducts,
  initialCategories,
  initialBanners,
  initialAuctionWinners = [],
  initialCategoryShowcases = [],
  initialBestSellersWeekly = [],
  initialTrustedShopProducts = [],
}: HomePageClientProps) {
  const { user, logout, checkAuth, isInitialized } = useAuthStore();
  const [showInsuranceDialog, setShowInsuranceDialog] = useState(false);
  const [showTelegramDialog, setShowTelegramDialog] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Show announcement dialogs for users who haven't dismissed them
  useEffect(() => {
    if (!isInitialized || !user) return;

    // Priority 1: Telegram channel dialog (for ALL users)
    const telegramDismissed = localStorage.getItem(TELEGRAM_CHANNEL_DISMISSED_KEY);
    if (!telegramDismissed) {
      const timer = setTimeout(() => setShowTelegramDialog(true), 1500);
      return () => clearTimeout(timer);
    }

    // Priority 2: Insurance dialog (for sellers only)
    if (user.isSeller) {
      const dismissed = localStorage.getItem(INSURANCE_DISMISSED_KEY);
      if (!dismissed) {
        const timer = setTimeout(() => setShowInsuranceDialog(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isInitialized]);

  const handleDismissInsurance = () => {
    setShowInsuranceDialog(false);
    localStorage.setItem(INSURANCE_DISMISSED_KEY, new Date().toISOString());
  };

  const handleDismissTelegram = () => {
    setShowTelegramDialog(false);
    localStorage.setItem(TELEGRAM_CHANNEL_DISMISSED_KEY, new Date().toISOString());
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header Component */}
      <Header
        user={isInitialized ? user : null}
        onLogout={handleLogout}
      />

      {/* Main Content - Single container for consistent alignment */}
      <div className="page-wrapper space-y-4 sm:space-y-6 py-3 sm:py-4 lg:py-6">
        {/* Hero Section + Category Showcases */}
        <HeroSection banners={initialBanners} showcases={initialCategoryShowcases} categories={initialCategories} />

        {/* ====== DEDUPLICATE PRODUCTS ACROSS SECTIONS ====== */}
        {(() => {
          const seenIds = new Set<string>();

          // Section 1: Featured (always shown)
          const featuredNormalized = (initialFeaturedProducts || []).map((p: any) => normalizeProduct(p));
          featuredNormalized.forEach((p: any) => seenIds.add(p.id));

          // Section 2: Best Sellers (exclude featured)
          const bestSellersFiltered = (initialBestSellersWeekly || [])
            .map((p: any) => normalizeProduct(p))
            .filter((p: any) => !seenIds.has(p.id));
          bestSellersFiltered.forEach((p: any) => seenIds.add(p.id));

          // Section 3: Trusted Shops (exclude featured + best sellers)
          const trustedFiltered = (initialTrustedShopProducts || [])
            .map((p: any) => normalizeProduct(p))
            .filter((p: any) => !seenIds.has(p.id));
          trustedFiltered.forEach((p: any) => seenIds.add(p.id));

          // Section 4: Latest (exclude all above)
          const latestFiltered = (initialLatestProducts || [])
            .filter((p: any) => !seenIds.has(p.id));

          return (
            <>
              {/* Featured Products + Auction Winner Pinned Products */}
              <FeaturedProducts
                products={featuredNormalized}
                title="Sản phẩm nổi bật"
                auctionWinners={initialAuctionWinners as any}
                viewAllHref="/explore?sort=popular"
              />

              {/* Best Sellers This Week */}
              {bestSellersFiltered.length > 0 && (
                <FeaturedProducts
                  products={bestSellersFiltered}
                  title="🔥 Bán chạy nhất tuần"
                  viewAllHref="/explore?sort=best_selling"
                />
              )}

              {/* Trusted Shop Products */}
              {trustedFiltered.length > 0 && (
                <FeaturedProducts
                  products={trustedFiltered}
                  title="🛡️ Shop uy tín – Đánh giá cao"
                  viewAllHref="/explore?sort=rating"
                />
              )}

              {/* Latest Products with Load More */}
              <LatestProductsSection initialProducts={latestFiltered} />
            </>
          );
        })()}
      </div>

      {/* Support Widgets */}
      <SupportWidgets />

      {/* Footer */}
      <Footer />

      {/* Telegram Channel Dialog */}
      {showTelegramDialog && (
        <TelegramChannelDialog isSeller={user?.isSeller || false} onClose={handleDismissTelegram} />
      )}

      {/* Insurance Announcement Dialog */}
      {showInsuranceDialog && (
        <InsuranceAnnouncementDialog onClose={handleDismissInsurance} />
      )}
    </div>
  );
}
