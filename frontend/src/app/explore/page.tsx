'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { ProductCard } from '@/components/ProductCard';
import {
  Search, SlidersHorizontal, Star, X, Package, ArrowUpDown, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/config';
import { normalizeProduct } from '@/lib/utils';
import { stripHtml } from '@/components/RichTextEditor';

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
  seller: { id: string; name: string; avatar?: string; sellerProfile?: any };
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
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const PRICE_RANGES = [
  { min: 0, max: 50000, label: 'Dưới 50K' },
  { min: 50000, max: 100000, label: '50K - 100K' },
  { min: 100000, max: 500000, label: '100K - 500K' },
  { min: 500000, max: 1000000, label: '500K - 1M' },
  { min: 1000000, max: null, label: 'Trên 1M' },
];

function ExploreLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number | null } | null>(null);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => { checkAuth(); fetchCategories(); }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('category') || '';
    const sort = searchParams.get('sort') || 'newest';
    if (q !== searchQuery) setSearchQuery(q);
    if (cat !== selectedCategory) setSelectedCategory(cat);
    if (sort !== sortBy) setSortBy(sort);
  }, [searchParams]);

  useEffect(() => { fetchProducts(); }, [searchQuery, selectedCategory, selectedPriceRange, sortBy, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await apiFetch('/categories?parent=true');
      if (response.ok) setCategories(await response.json());
    } catch (error) { console.error('Error fetching categories:', error); }
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
      if (sortBy) params.append('sortBy', sortBy);

      const response = await apiFetch(`/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts((data.products || []).map((p: any) => normalizeProduct(p)));
        setPagination(prev => ({ ...prev, total: data.total || 0, totalPages: data.totalPages || 1 }));
      }
    } catch (error) { console.error('Error fetching products:', error); }
    finally { setIsLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 1 })); };
  const handleLogout = () => { logout(); router.push('/'); };
  const handleHeaderSearch = (query: string) => { setSearchQuery(query); setPagination(prev => ({ ...prev, page: 1 })); };

  const clearFilters = () => {
    setSearchQuery(''); setSelectedCategory(''); setSelectedPriceRange(null);
    setSortBy('newest'); setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFiltersCount = [selectedCategory, selectedPriceRange].filter(Boolean).length;

  // Find selected category name
  const selectedCatName = categories.find(c => c.id === selectedCategory)?.name
    || categories.flatMap(c => c.children || []).find(c => c.id === selectedCategory)?.name
    || '';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleHeaderSearch} />

      <main className="flex-1 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4">

          {/* ── Breadcrumb ── */}
          <div className="flex items-center gap-1.5 text-[13px] text-gray-400 mb-4">
            <Link href="/" className="hover:text-blue-500 transition-colors">Trang chủ</Link>
            <span>/</span>
            <span className="text-gray-700">Khám phá</span>
            {selectedCatName && (
              <>
                <span>/</span>
                <span className="text-gray-700">{selectedCatName}</span>
              </>
            )}
          </div>

          {/* ── Category Pills ── */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
            <button
              onClick={() => { setSelectedCategory(''); setPagination(prev => ({ ...prev, page: 1 })); }}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150
                ${!selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setPagination(prev => ({ ...prev, page: 1 })); }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150
                  ${selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* ── Subcategories (if parent selected) ── */}
          {selectedCategory && categories.find(c => c.id === selectedCategory)?.children?.length ? (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
              {categories.find(c => c.id === selectedCategory)?.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => { setSelectedCategory(child.id); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] text-gray-500 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-all"
                >
                  {child.name}
                </button>
              ))}
            </div>
          ) : null}

          {/* ── Search Bar ── */}
          <div className="mb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* ── Sort Buttons (always visible) ── */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mb-4 pb-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setSortBy(opt.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 border
                  ${sortBy === opt.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
              >
                {opt.label}
              </button>
            ))}

            {/* Separator */}
            <div className="w-px h-5 bg-gray-200 flex-shrink-0 mx-1" />

            {/* Mobile filter button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium bg-white text-gray-600 border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Lọc giá
              {selectedPriceRange && (
                <span className="w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">1</span>
              )}
            </button>

            {/* Price filter pills - desktop */}
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPriceRange(
                  selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max ? null : range
                )}
                className={`hidden lg:block flex-shrink-0 px-2.5 py-1.5 rounded-full text-[11px] transition-all border
                  ${selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                    ? 'bg-blue-100 text-blue-700 font-medium border-blue-300'
                    : 'text-gray-500 border-transparent hover:bg-gray-100'
                  }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-gray-400">
              {pagination.total > 0 ? `${pagination.total} sản phẩm` : ''}
            </span>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* ── Active Filters ── */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              {selectedPriceRange && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px]">
                  {PRICE_RANGES.find(r => r.min === selectedPriceRange.min)?.label}
                  <button onClick={() => setSelectedPriceRange(null)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                Xóa tất cả
              </button>
            </div>
          )}

          {/* ── Mobile Filter Panel ── */}
          {showMobileFilters && (
            <div className="lg:hidden mb-4 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-900">Khoảng giá</span>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedPriceRange(
                        selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max ? null : range
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-[12px] border transition-all
                      ${selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-blue-300'
                      }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Products ── */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">Không tìm thấy sản phẩm</p>
              <button onClick={clearFilters} className="text-[13px] text-blue-600 hover:text-blue-700 font-medium">
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 mt-8">
              <button
                disabled={pagination.page <= 1}
                onClick={() => { setPagination(p => ({ ...p, page: p.page - 1 })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                    onClick={() => { setPagination(prev => ({ ...prev, page: p })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors
                      ${pagination.page === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ));
              })()}
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => { setPagination(p => ({ ...p, page: p.page + 1 })); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
