'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/config';
import { normalizeProduct } from '@/lib/utils';
import { VerifyBadge } from '@/components/VerifyBadge';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import {
  Store, Star, Package, Clock, MessageCircle,
  Loader2, ChevronRight
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
  return url;
}

interface ShopInfo {
  id: string;
  sellerId?: string;
  name: string;
  description: string;
  logo?: string;
  banner?: string;
  rating: number;
  totalSales: number;
  totalProducts: number;
  isVerified: boolean;
  insuranceLevel?: number;
  insuranceTier?: string;
  isProfileComplete?: boolean;
  joinDate: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  hasVariants?: boolean;
  images: string;
  stock: number;
  sales: number;
  rating: number;
  category: { id: string; name: string; slug: string };
}

interface ShopPageClientProps {
  shop: ShopInfo;
  initialProducts: Product[];
  initialPagination: { page: number; limit: number; total: number; totalPages: number };
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

export default function ShopPageClient({ shop, initialProducts, initialPagination }: ShopPageClientProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchMoreProducts = useCallback(async (page: number) => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      params.append('sort', sortBy);
      const response = await apiFetch(`/shop/${shop.id}/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts((data.products || []).map((p: any) => normalizeProduct(p)));
        const pg = data.pagination || {};
        setPagination(prev => ({ ...prev, page: pg.page || page, total: pg.total || prev.total, totalPages: pg.totalPages || prev.totalPages }));
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    } catch (error) { console.error('Error fetching products:', error); }
    finally { setIsLoadingMore(false); }
  }, [shop.id, sortBy, pagination.limit, isLoadingMore]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.page) {
      fetchMoreProducts(newPage);
    }
  };

  const handleLogout = () => { logout(); router.push('/'); };
  const handleSearch = (query: string) => router.push(`/explore?q=${encodeURIComponent(query)}`);

  const handleStartChat = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/shop/${shop.id}`));
      return;
    }
    const sellerId = shop.sellerId || shop.id;
    router.push(`/messages?seller=${sellerId}&sellerName=${encodeURIComponent(shop.name)}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${shop.name} - Cửa hàng trên BachHoaMMO`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.name, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      // Simple feedback
      const btn = document.getElementById('share-btn');
      if (btn) {
        btn.textContent = 'Đã copy!';
        setTimeout(() => { btn.textContent = 'Chia sẻ'; }, 2000);
      }
    }
  };

  const formatJoinDate = (date: string) => {
    const months = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return 'Vừa tham gia';
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    return `${years} năm`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const shopLogoUrl = shop.logo ? getImageUrl(shop.logo) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        {/* ── Shop Header ── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
            <div className="flex items-start gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-white">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600">
                    <Store className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name + Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{shop.name}</h1>
                  {(shop.isVerified || (shop.insuranceLevel && shop.insuranceLevel > 0)) && <VerifyBadge size={26} isVerified={shop.isVerified} insuranceLevel={shop.insuranceLevel} insuranceTier={shop.insuranceTier} />}
                </div>

                {/* Stats inline */}
                <div className="flex items-center gap-3 text-[13px] text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-gray-700">{shop.rating.toFixed(1)}</span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>{formatNumber(shop.totalSales)} đã bán</span>
                  <span className="text-gray-300">|</span>
                  <span>{shop.totalProducts} sản phẩm</span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="hidden sm:inline">
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {formatJoinDate(shop.joinDate)}
                  </span>
                </div>

                {/* Description */}
                {shop.description && (
                  <p className="text-[13px] text-gray-400 line-clamp-1 max-w-xl">{shop.description}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleStartChat}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat với Shop
                  </button>
                  <button
                    id="share-btn"
                    onClick={handleShare}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 text-[12px] font-medium rounded-lg transition-colors"
                  >
                    Chia sẻ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Products Section ── */}
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[13px] text-gray-400 mb-4">
            <Link href="/" className="hover:text-blue-500 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-gray-700">{shop.name}</span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] text-gray-500">
              {pagination.total > 0 ? `${pagination.total} sản phẩm` : 'Chưa có sản phẩm'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); fetchMoreProducts(1); }}
              className="h-8 px-2.5 pr-7 border border-gray-200 rounded-lg text-[12px] bg-white text-gray-600 outline-none focus:border-blue-300"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Products Grid */}
          {isLoadingMore ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">Shop chưa có sản phẩm nào</p>
              <Link href="/explore" className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
                Khám phá sản phẩm khác →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 mt-8">
              <button
                disabled={pagination.page <= 1 || isLoadingMore}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg text-[13px] text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Trước
              </button>
              {(() => {
                const total = pagination.totalPages;
                const current = pagination.page;
                let start = Math.max(1, current - 2);
                let end = Math.min(total, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);
                const pages = [];
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    disabled={isLoadingMore}
                    className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors
                      ${pagination.page === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ));
              })()}
              <button
                disabled={pagination.page >= pagination.totalPages || isLoadingMore}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg text-[13px] text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
