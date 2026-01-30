'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { VerifyBadge } from '@/components/VerifyBadge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  Star, 
  Package, 
  Clock, 
  MessageCircle,
  Grid3X3,
  List,
  ShoppingCart,
  CheckCircle2,
  TrendingUp,
  Heart,
  Share2,
  MapPin,
  Shield,
  Award,
  Users,
  ChevronRight
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
  sellerId?: string; // User ID of the seller
  name: string;
  description: string;
  logo?: string;
  banner?: string;
  rating: number;
  totalSales: number;
  totalProducts: number;
  isVerified: boolean;
  joinDate: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  salePrice?: number;
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
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
];

/**
 * ShopPageClient - Receives initial data from server
 * NO client-side API calls for initial load!
 */
export default function ShopPageClient({ shop, initialProducts, initialPagination }: ShopPageClientProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { addItem } = useCartStore();
  
  const [products] = useState<Product[]>(initialProducts);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagination] = useState(initialPagination);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const handleStartChat = async () => {
    if (!user) {
      // Redirect to login if not logged in
      router.push('/login?redirect=' + encodeURIComponent(`/shop/${shop.id}`));
      return;
    }

    // Redirect to messages page with seller info - let messages page handle conversation creation
    const sellerId = shop.sellerId || shop.id;
    router.push(`/messages?seller=${sellerId}&sellerName=${encodeURIComponent(shop.name)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const formatJoinDate = (date: string) => {
    const months = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (months < 1) return 'Vừa tham gia';
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    return `${years} năm ${months % 12 > 0 ? `${months % 12} tháng` : ''}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      salePrice: product.salePrice,
      image: images[0] || '',
      stock: product.stock,
      sellerId: shop.id,
      sellerName: shop.name,
    });
  };

  const shopLogoUrl = shop.logo ? getImageUrl(shop.logo) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        {/* Hero Banner Section */}
        <div className="bg-[#2563eb] h-36 sm:h-44 md:h-52" />

        {/* Shop Profile Card */}
        <div className="container mx-auto px-4 lg:px-8 -mt-16 sm:-mt-20 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-8">
            {/* Profile Header */}
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Avatar */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0 -mt-12 sm:-mt-16 bg-white">
                  {shopLogoUrl ? (
                    <img 
                      src={shopLogoUrl} 
                      alt={shop.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2563eb]">
                      <Store className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>

                {/* Info & Actions Container */}
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Shop Info */}
                    <div className="text-center sm:text-left">
                      {/* Name & Verified */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{shop.name}</h1>
                        {shop.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full text-xs font-semibold text-blue-600">
                            <VerifyBadge size={14} />
                            Đã xác minh
                          </span>
                        )}
                      </div>
                      
                      {/* Stats Row */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 rounded-full">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold text-gray-900">{shop.rating.toFixed(1)}</span>
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{formatNumber(shop.totalSales)} đã bán</span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-500 line-clamp-2 max-w-md">
                        {shop.description || 'Chào mừng bạn đến với shop của chúng tôi!'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center sm:justify-end gap-2 flex-shrink-0">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleStartChat}
                      >
                        <MessageCircle className="w-4 h-4 mr-1.5" />
                        Chat với Shop
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setIsFollowing(!isFollowing)}
                        className={isFollowing ? "border-red-200 text-red-500 hover:bg-red-50" : ""}
                      >
                        <Heart className={`w-4 h-4 mr-1.5 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                        {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                      </Button>
                      <Button variant="outline" size="icon">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="border-t border-gray-100 grid grid-cols-4">
              <div className="py-3 px-2 text-center border-r border-gray-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                </div>
                <div className="text-base font-bold text-gray-900">{shop.rating.toFixed(1)}</div>
                <div className="text-[11px] text-gray-500">Đánh giá</div>
              </div>
              <div className="py-3 px-2 text-center border-r border-gray-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-base font-bold text-gray-900">{shop.totalProducts}</div>
                <div className="text-[11px] text-gray-500">Sản phẩm</div>
              </div>
              <div className="py-3 px-2 text-center border-r border-gray-100">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-base font-bold text-gray-900">{formatNumber(shop.totalSales)}</div>
                <div className="text-[11px] text-gray-500">Đã bán</div>
              </div>
              <div className="py-3 px-2 text-center">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-base font-bold text-gray-900 truncate">{formatJoinDate(shop.joinDate)}</div>
                <div className="text-[11px] text-gray-500">Hoạt động</div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                Đảm bảo chất lượng
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-500" />
                Shop uy tín
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                Phản hồi nhanh
              </span>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="container mx-auto px-4 lg:px-8 pb-12">
          {/* Section Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-6 h-6 text-blue-600" />
                  Tất cả sản phẩm
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Hiển thị <span className="font-semibold text-gray-700">{products.length}</span> trong tổng số <span className="font-semibold text-gray-700">{pagination.total}</span> sản phẩm
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Sort Dropdown */}
                <div className="relative flex-1 sm:flex-none">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full sm:w-auto appearance-none text-sm border-2 border-gray-200 rounded-xl px-4 py-2.5 pr-10 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-gray-700 cursor-pointer hover:border-gray-300"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 transition-all ${viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                    title="Xem dạng lưới"
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 transition-all ${viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                    title="Xem dạng danh sách"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {products.map((product) => {
                const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                const imageUrl = images[0] ? getImageUrl(images[0]) : '';
                const discount = product.salePrice 
                  ? Math.round((1 - product.salePrice / product.price) * 100) 
                  : 0;
                const isHovered = hoveredProduct === product.id;

                return (
                  <Link 
                    key={product.id} 
                    href={`/products/${product.id}`}
                    className="group"
                    onMouseEnter={() => setHoveredProduct(product.id)}
                    onMouseLeave={() => setHoveredProduct(null)}
                  >
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      {/* Image */}
                      <div className="aspect-square relative overflow-hidden bg-gray-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {discount > 0 && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
                            -{discount}%
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className={`absolute inset-x-0 bottom-0 p-3 bg-black/60 transition-all duration-300 ${
                          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                        }`}>
                          <button 
                            onClick={(e) => handleAddToCart(e, product)}
                            className="w-full py-2.5 bg-white hover:bg-blue-600 hover:text-white text-gray-900 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Thêm vào giỏ
                          </button>
                        </div>

                        {/* Wishlist Button */}
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-white transition-all shadow-md hover:scale-110"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-3 min-h-[2.5rem] leading-snug">
                          {product.title}
                        </h3>

                        {/* Stats */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 rounded-full">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{product.sales} đã bán</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-red-500">
                            {formatPrice(product.salePrice || product.price)}
                          </span>
                          {product.salePrice && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {products.map((product) => {
                const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                const imageUrl = images[0] ? getImageUrl(images[0]) : '';
                const discount = product.salePrice 
                  ? Math.round((1 - product.salePrice / product.price) * 100) 
                  : 0;

                return (
                  <Link key={product.id} href={`/products/${product.id}`} className="block group">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex">
                      {/* Image */}
                      <div className="w-40 sm:w-52 lg:w-64 flex-shrink-0 relative overflow-hidden bg-gray-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center aspect-square">
                            <Package className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
                            -{discount}%
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                            {product.title}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {product.description}
                          </p>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 rounded-full">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-sm font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-sm text-gray-500">{product.sales} đã bán</span>
                            <span className="text-sm text-gray-400">Còn {product.stock} sản phẩm</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-red-500">
                              {formatPrice(product.salePrice || product.price)}
                            </span>
                            {product.salePrice && (
                              <span className="text-base text-gray-400 line-through">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                          <Button
                            onClick={(e) => handleAddToCart(e, product)}
                            className="bg-[#2563eb] hover:bg-blue-700 text-white shadow-lg"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Thêm vào giỏ
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {products.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 sm:p-16 text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có sản phẩm</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Shop này hiện chưa có sản phẩm nào. Hãy quay lại sau nhé!
              </p>
              <Button 
                onClick={() => router.push('/explore')}
                className="mt-6 bg-[#2563eb] hover:bg-blue-700"
              >
                Khám phá sản phẩm khác
              </Button>
            </div>
          )}

          {/* Pagination hint */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 mb-4">
                Trang {pagination.page} / {pagination.totalPages}
              </p>
              <Button variant="outline" size="lg" className="border-2">
                Xem thêm sản phẩm
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
