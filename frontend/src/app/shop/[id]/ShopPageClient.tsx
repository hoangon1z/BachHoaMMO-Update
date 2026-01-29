'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  CheckCircle,
  MessageCircle,
  Grid3X3,
  List,
  ArrowUpDown,
  ShoppingCart
} from 'lucide-react';

interface ShopInfo {
  id: string;
  name: string;
  description: string;
  logo?: string;
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
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
  { value: 'best_selling', label: 'Bán chạy nhất' },
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatJoinDate = (date: string) => {
    const months = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (months < 1) return 'Vừa tham gia';
    if (months < 12) return `${months} tháng`;
    return `${Math.floor(months / 12)} năm`;
  };

  const handleAddToCart = (product: Product) => {
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

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        {/* Shop Header */}
        <div className="bg-white border-b border-border">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Shop Logo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-secondary border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                  {shop.logo ? (
                    <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Shop Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{shop.name}</h1>
                  {shop.isVerified && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <p className="text-muted-foreground mb-4 line-clamp-2">{shop.description}</p>
                
                {/* Shop Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{shop.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">Đánh giá</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-medium">{shop.totalProducts}</span>
                    <span className="text-muted-foreground">Sản phẩm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{shop.totalSales}</span>
                    <span className="text-muted-foreground">Đã bán</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tham gia {formatJoinDate(shop.joinDate)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="container mx-auto px-4 py-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {pagination.total} sản phẩm
            </p>
            <div className="flex items-center gap-4">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* View Mode */}
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {products.map((product) => {
              const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
              const discount = product.salePrice 
                ? Math.round((1 - product.salePrice / product.price) * 100) 
                : 0;

              return (
                <div key={product.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/products/${product.id}`}>
                    <div className="aspect-square relative">
                      <img
                        src={images[0] || '/placeholder.png'}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link href={`/products/${product.id}`}>
                      <h3 className="font-medium line-clamp-2 hover:text-primary mb-2">
                        {product.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary font-bold">
                        {formatPrice(product.salePrice || product.price)}
                      </span>
                      {product.salePrice && (
                        <span className="text-muted-foreground text-sm line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                      <span>{product.sales} đã bán</span>
                    </div>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Thêm vào giỏ
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {products.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Shop chưa có sản phẩm nào</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
