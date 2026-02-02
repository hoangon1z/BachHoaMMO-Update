'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  SlidersHorizontal,
  Grid3X3,
  List,
  Star,
  ChevronDown,
  ChevronRight,
  X,
  Package,
  ArrowUpDown,
  Loader2,
  Folder,
  MonitorPlay,
  Cpu,
  Music,
  MessageCircle,
  Video,
  GraduationCap,
  Globe,
  Layers
} from 'lucide-react';

// Icon mapping for categories
const getCategoryIcon = (slug: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'tai-khoan': <Folder className="w-4 h-4" />,
    'phan-mem': <Cpu className="w-4 h-4" />,
    'dich-vu': <Layers className="w-4 h-4" />,
    'khac': <Package className="w-4 h-4" />,
    'tai-khoan-netflix': <MonitorPlay className="w-4 h-4" />,
    'tai-khoan-spotiffy': <Music className="w-4 h-4" />,
    'tai-khoan-facebook': <MessageCircle className="w-4 h-4" />,
    'tai-khoan-youtube': <Video className="w-4 h-4" />,
    'tai-khoan-telegram': <MessageCircle className="w-4 h-4" />,
    'tai-khoan-ai': <Cpu className="w-4 h-4" />,
    'tai-khoan-canva': <Layers className="w-4 h-4" />,
    'tai-khoan-cap-cut': <Video className="w-4 h-4" />,
    'tai-khoan-hoc-tap': <GraduationCap className="w-4 h-4" />,
    'tai-khoan-vpn-proxy': <Globe className="w-4 h-4" />,
    'tai-khoan-adobe': <Layers className="w-4 h-4" />,
    'key-van-phong-do-hoa': <Cpu className="w-4 h-4" />,
  };
  return iconMap[slug] || <Folder className="w-4 h-4" />;
};
import Link from 'next/link';
import { apiFetch } from '@/lib/config';

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
  seller: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  children?: Category[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'best_selling', label: 'Bán chạy nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const PRICE_RANGES = [
  { min: 0, max: 50000, label: 'Dưới 50K' },
  { min: 50000, max: 100000, label: '50K - 100K' },
  { min: 100000, max: 500000, label: '100K - 500K' },
  { min: 500000, max: 1000000, label: '500K - 1M' },
  { min: 1000000, max: null, label: 'Trên 1M' },
];

const RATING_FILTERS = [
  { value: 4, label: '4 sao trở lên' },
  { value: 3, label: '3 sao trở lên' },
  { value: 2, label: '2 sao trở lên' },
];

// Loading fallback for Suspense
function ExploreLoading() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

// Wrapper component with Suspense
export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExplorePageContent />
    </Suspense>
  );
}

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number | null } | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    checkAuth();
    fetchCategories();
  }, []);

  // Sync URL params with state
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
    if (cat !== selectedCategory) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedPriceRange, minRating, sortBy, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await apiFetch('/categories?parent=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedPriceRange) {
        params.append('minPrice', selectedPriceRange.min.toString());
        if (selectedPriceRange.max) params.append('maxPrice', selectedPriceRange.max.toString());
      }
      if (minRating) params.append('minRating', minRating.toString());
      if (sortBy) params.append('sortBy', sortBy);

      const response = await apiFetch(`/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        // API returns total, page, totalPages directly in response (not nested in pagination)
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          page: data.page || 1,
          totalPages: data.totalPages || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleHeaderSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPriceRange(null);
    setMinRating(null);
    setSortBy('newest');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = [
    selectedCategory,
    selectedPriceRange,
    minRating,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleHeaderSearch} />

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Khám phá sản phẩm</h1>
            <p className="text-gray-600 mt-1">Tìm kiếm và khám phá hàng ngàn sản phẩm chất lượng</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-12 h-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
                Tìm kiếm
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 lg:hidden relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <aside className={`
              ${showFilters ? 'fixed inset-0 z-50 bg-white p-4 overflow-y-auto' : 'hidden'}
              lg:block lg:static lg:w-64 lg:flex-shrink-0
            `}>
              {/* Mobile Filter Header */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h2 className="text-lg font-bold">Bộ lọc</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Categories - Smart Tree View */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Danh mục
                  </h3>
                  <div className="space-y-1">
                    {/* All categories button */}
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        !selectedCategory ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Package className={`w-4 h-4 ${!selectedCategory ? 'text-blue-500' : 'text-gray-400'}`} />
                      Tất cả danh mục
                    </button>
                    
                    {/* Parent categories with children */}
                    {categories.map((cat) => (
                      <div key={cat.id} className="space-y-0.5">
                        {/* Parent category */}
                        <button
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                            selectedCategory === cat.id 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={selectedCategory === cat.id ? 'text-blue-500' : 'text-gray-400'}>
                              {getCategoryIcon(cat.slug)}
                            </span>
                            {cat.name}
                          </span>
                          {cat.children && cat.children.length > 0 && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {cat.children.length}
                            </span>
                          )}
                        </button>
                        
                        {/* Child categories */}
                        {cat.children && cat.children.length > 0 && (
                          <div className="ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
                            {cat.children.map((child) => (
                              <button
                                key={child.id}
                                onClick={() => setSelectedCategory(child.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                  selectedCategory === child.id 
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                <span className={selectedCategory === child.id ? 'text-blue-500' : 'text-gray-400'}>
                                  {getCategoryIcon(child.slug)}
                                </span>
                                <span className="truncate">{child.name.replace('Tài khoản ', '').replace('Key ', '')}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Khoảng giá
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedPriceRange(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedPriceRange ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      Tất cả
                    </button>
                    {PRICE_RANGES.map((range, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPriceRange(range)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Đánh giá
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setMinRating(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !minRating ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      Tất cả
                    </button>
                    {RATING_FILTERS.map((rating) => (
                      <button
                        key={rating.value}
                        onClick={() => setMinRating(rating.value)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                          minRating === rating.value ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < rating.value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        {rating.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {activeFiltersCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Xóa bộ lọc
                  </Button>
                )}

                {/* Mobile Apply Button */}
                <div className="lg:hidden">
                  <Button onClick={() => setShowFilters(false)} className="w-full bg-blue-600 hover:bg-blue-700">
                    Áp dụng
                  </Button>
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-sm text-gray-600">
                  {pagination.total > 0 ? (
                    <>Hiển thị <span className="font-medium">{products.length}</span> / {pagination.total} sản phẩm</>
                  ) : (
                    'Không có sản phẩm nào'
                  )}
                </p>
                <div className="flex items-center gap-3">
                  {/* Sort */}
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-gray-500" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* View Mode */}
                  <div className="hidden sm:flex items-center border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products */}
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
                  <p className="text-gray-500 mb-4">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  <Button onClick={clearFilters} variant="outline">Xóa bộ lọc</Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product) => {
                    let images: string[] = [];
                    try { images = JSON.parse(product.images); } catch {}
                    const discount = product.salePrice && product.price > product.salePrice
                      ? Math.round((1 - product.salePrice / product.price) * 100)
                      : 0;

                    return (
                      <Link key={product.id} href={`/products/${product.id}`}>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg transition-all">
                          <div className="relative aspect-square bg-gray-100">
                            {images[0] ? (
                              <img src={images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            {discount > 0 && (
                              <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                -{discount}%
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 min-h-[40px]">
                              {product.title}
                            </h3>
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-gray-600">{product.rating?.toFixed(1) || '0.0'}</span>
                              <span className="text-xs text-gray-400">• {product.sales} đã bán</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-blue-600">
                                {(product.salePrice || product.price).toLocaleString('vi-VN')}đ
                              </span>
                              {product.salePrice && product.salePrice < product.price && (
                                <span className="text-xs text-gray-400 line-through">
                                  {product.price.toLocaleString('vi-VN')}đ
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
                <div className="space-y-4">
                  {products.map((product) => {
                    let images: string[] = [];
                    try { images = JSON.parse(product.images); } catch {}

                    return (
                      <Link key={product.id} href={`/products/${product.id}`}>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 hover:shadow-lg transition-all">
                          <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {images[0] ? (
                              <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">{product.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{product.description}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm">{product.rating?.toFixed(1) || '0.0'}</span>
                              </div>
                              <span className="text-sm text-gray-400">• {product.sales} đã bán</span>
                              <span className="text-sm text-gray-400">• Còn {product.stock}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-blue-600">
                                {(product.salePrice || product.price).toLocaleString('vi-VN')}đ
                              </span>
                              {product.salePrice && product.salePrice < product.price && (
                                <span className="text-sm text-gray-400 line-through">
                                  {product.price.toLocaleString('vi-VN')}đ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  >
                    Trước
                  </Button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => setPagination(p => ({ ...p, page }))}
                          className={`w-10 h-10 rounded-lg font-medium ${
                            pagination.page === page
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
