'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Star, ShoppingCart, Heart, MessageCircle, Shield, Zap, Check, Minus, Plus, ChevronRight, Store, Clock, Eye, Share2, BadgeCheck, TrendingUp, Package, ThumbsUp, ExternalLink, AlertCircle, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { VerifyBadge } from '@/components/VerifyBadge';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  stock: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  salePrice?: number;
  stock: number;
  images: string[];
  hasVariants?: boolean;
  variants?: ProductVariant[];
  category: { id: string; name: string; slug: string; };
  seller: { id: string; name: string; avatar?: string; shopLogo?: string; rating: number; totalSales: number; joinDate: string; };
  rating: number;
  totalReviews: number;
  totalSold: number;
  views?: number;
}

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isStartingChat, setIsStartingChat] = useState(false);
  
  // Error/Toast modal state
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'warning' | 'info'; text: string } | null>(null);

  // Handle chat with seller
  const handleChatWithSeller = async () => {
    if (!user) {
      router.push(`/login?redirect=/products/${product.id}`);
      return;
    }

    // Don't allow seller to chat with themselves
    if (user.id === product.seller.id) {
      setToastMessage({ type: 'warning', text: 'Bạn không thể chat với chính mình' });
      return;
    }

    setIsStartingChat(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/start-with-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sellerId: product.seller.id,
          productId: product.id,
        }),
      });

      const data = await response.json();
      if (data.success && data.conversation) {
        // Redirect to messages page with conversation ID
        router.push(`/messages?id=${data.conversation._id}`);
      } else {
        console.error('Failed to start conversation:', data);
        setToastMessage({ type: 'error', text: data.message || 'Không thể bắt đầu cuộc trò chuyện' });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      setToastMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsStartingChat(false);
    }
  };
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.hasVariants && product.variants && product.variants.length > 0
      ? product.variants[0].id
      : null
  );

  // Get selected variant
  const selectedVariant = useMemo(() => {
    if (!product.hasVariants || !product.variants || !selectedVariantId) return null;
    return product.variants.find(v => v.id === selectedVariantId) || null;
  }, [product.hasVariants, product.variants, selectedVariantId]);

  // Get current price and stock based on variant selection
  const currentPrice = selectedVariant?.price ?? product.price;
  const currentSalePrice = selectedVariant?.salePrice ?? product.salePrice;
  const currentStock = selectedVariant?.stock ?? product.stock;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Validate variant selection
    if (product.hasVariants && !selectedVariant) {
      setToastMessage({ type: 'warning', text: 'Vui lòng chọn phân loại sản phẩm' });
      return;
    }

    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      title: selectedVariant ? `${product.title} - ${selectedVariant.name}` : product.title,
      price: currentPrice,
      salePrice: currentSalePrice,
      image: product.images[0] || '',
      stock: currentStock,
      sellerId: product.seller.id,
      sellerName: product.seller.name,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (product.hasVariants && !selectedVariant) {
      setToastMessage({ type: 'warning', text: 'Vui lòng chọn phân loại sản phẩm' });
      return;
    }
    handleAddToCart();
    router.push('/cart');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const discount = currentSalePrice
    ? Math.round((1 - currentSalePrice / currentPrice) * 100)
    : 0;

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-secondary">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6 text-gray-500">
          <Link href="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/explore" className="hover:text-blue-600 transition-colors">Sản phẩm</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-700 font-medium">{product.category.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* Product Main Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">

                {/* Product Image */}
                <div className="p-4 md:p-6">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-4">
                    <img
                      src={product.images[selectedImage] || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-contain"
                    />
                    {discount > 0 && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-md">
                        -{discount}%
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2">
                      {product.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(idx)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx
                              ? 'border-blue-500 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 md:p-6 md:border-l border-gray-100">
                  {/* Title */}
                  <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug">
                    {product.title}
                  </h1>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">{product.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">({product.totalReviews})</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <span className="text-sm text-gray-500">Đã bán {product.totalSold}</span>
                    {product.views && (
                      <>
                        <div className="w-px h-4 bg-gray-200"></div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Eye className="w-3.5 h-3.5" />
                          {product.views.toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Variants Selection */}
                  {product.hasVariants && product.variants && product.variants.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Phân loại</label>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((variant) => (
                          <button
                            key={variant.id}
                            onClick={() => {
                              setSelectedVariantId(variant.id);
                              setQuantity(1);
                            }}
                            disabled={variant.stock === 0}
                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedVariantId === variant.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : variant.stock === 0
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                          >
                            {variant.name}
                            {variant.stock === 0 && ' (Hết)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-baseline gap-3">
                      {currentSalePrice ? (
                        <>
                          <span className="text-2xl font-bold text-red-500">
                            {formatPrice(currentSalePrice)}
                          </span>
                          <span className="text-base text-gray-400 line-through">
                            {formatPrice(currentPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-blue-600">
                          {formatPrice(currentPrice)}
                        </span>
                      )}
                    </div>
                    {currentSalePrice && (
                      <p className="text-sm text-green-600 mt-2">
                        Tiết kiệm {formatPrice(currentPrice - currentSalePrice)}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Số lượng</span>
                      <span className="text-sm text-gray-500">{currentStock} có sẵn</span>
                    </div>
                    <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        disabled={quantity >= currentStock}
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button
                        onClick={handleAddToCart}
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white font-semibold transition-all"
                        disabled={currentStock === 0}
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {addedToCart ? 'Đã thêm' : 'Thêm giỏ hàng'}
                      </Button>
                      <Button
                        onClick={handleBuyNow}
                        className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
                        disabled={currentStock === 0}
                      >
                        Mua ngay
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsWishlisted(!isWishlisted)}
                        className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${isWishlisted
                            ? 'bg-red-50 text-red-500 border border-red-200'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                        Yêu thích
                      </button>
                      <button className="flex-1 h-10 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-2 text-sm font-medium transition-all">
                        <Share2 className="w-4 h-4" />
                        Chia sẻ
                      </button>
                    </div>
                  </div>

                  {currentStock === 0 && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                      <span className="text-red-600 font-medium text-sm">Sản phẩm tạm hết hàng</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Features Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cam kết của chúng tôi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Trung gian giao dịch</p>
                    <p className="text-xs text-gray-500">Đảm bảo quyền lợi khách hàng 100%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Giao dịch nhanh</p>
                    <p className="text-xs text-gray-500">An toàn</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hoàn trả</p>
                    <p className="text-xs text-gray-500">Nếu sai sản phẩm hoặc lỗi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Seller Card - Only shown on mobile, before description */}
            <div className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              {/* Shop Info Row */}
              <div className="flex items-center gap-3 mb-4">
                {/* Avatar */}
                <Link href={`/shop/${product.seller.id}`} className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-100">
                    {(product.seller.shopLogo || product.seller.avatar) ? (
                      <img 
                        src={product.seller.shopLogo || product.seller.avatar} 
                        alt={product.seller.name}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-[#2563eb] flex items-center justify-center">
                        <Store className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </Link>
                
                {/* Shop Name & Stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/shop/${product.seller.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate text-sm">
                      {product.seller.name}
                    </Link>
                    <VerifyBadge size={20} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {product.seller.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>{product.seller.totalSales} đã bán</span>
                    <span className="ml-auto flex items-center gap-1 text-green-600">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Online
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Link href={`/shop/${product.seller.id}`} className="flex-1">
                  <Button className="w-full h-9 rounded-lg font-medium bg-[#2563eb] hover:bg-blue-700 text-white text-sm">
                    <Store className="w-4 h-4 mr-1.5" />
                    Xem Shop
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="flex-1 h-9 rounded-lg font-medium border-2 text-sm"
                  onClick={handleChatWithSeller}
                  disabled={isStartingChat}
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Chat
                </Button>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                Mô tả sản phẩm
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Reviews Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                Đánh giá ({product.totalReviews})
              </h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Star className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm mb-4">Chưa có đánh giá nào</p>
                <Button variant="outline" className="rounded-xl">
                  Viết đánh giá đầu tiên
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Seller (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              
              {/* Shop Header */}
              <div className="relative bg-[#2563eb] p-4 h-20">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>
                
                {/* Online Status */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-white">Online</span>
                </div>

                {/* Verified Badge */}
                {product.seller.rating >= 4 && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-medium text-white">Uy tín</span>
                  </div>
                )}
              </div>
              
              {/* Shop Avatar & Info */}
              <div className="relative px-4 -mt-8 pb-4">
                {/* Avatar */}
                <div className="flex justify-center mb-3">
                  <Link href={`/shop/${product.seller.id}`} className="relative group">
                    <div className="w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center overflow-hidden ring-4 ring-white">
                      {(product.seller.shopLogo || product.seller.avatar) ? (
                        <img 
                          src={product.seller.shopLogo || product.seller.avatar} 
                          alt={product.seller.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="w-full h-full bg-[#2563eb] flex items-center justify-center">
                          <Store className="w-7 h-7 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Verified check */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </Link>
                </div>
                
                {/* Shop Name & Info - Centered */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/shop/${product.seller.id}`}
                      className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-lg"
                    >
                      {product.seller.name}
                    </Link>
                    <VerifyBadge size={20} />
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>Tham gia {product.seller.joinDate}</span>
                  </div>
                </div>
              </div>

              {/* Shop Stats - Modern Cards */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-gray-900">{product.seller.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Đánh giá</span>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Package className="w-4 h-4 text-green-500" />
                      <span className="font-bold text-gray-900">
                        {product.seller.totalSales >= 1000 
                          ? `${(product.seller.totalSales / 1000).toFixed(1)}k` 
                          : product.seller.totalSales}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Đã bán</span>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ThumbsUp className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-gray-900">98%</span>
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Hài lòng</span>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>Phản hồi trong vài phút</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Nhanh</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>Tỷ lệ giao hàng</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">99%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4 space-y-2">
                <Link href={`/shop/${product.seller.id}`} className="block">
                  <Button className="w-full h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200">
                    <Store className="w-4 h-4 mr-2" />
                    Xem cửa hàng
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full h-11 rounded-xl font-semibold border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all"
                  onClick={handleChatWithSeller}
                  disabled={isStartingChat}
                >
                  {isStartingChat ? (
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4 mr-2" />
                  )}
                  {isStartingChat ? 'Đang kết nối...' : 'Chat với Shop'}
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="px-4 pb-4">
                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-green-200">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Shop Uy Tín</p>
                      <p className="text-xs text-green-600">Được xác minh bởi BachHoaMMO</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Toast/Error Modal */}
      {toastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setToastMessage(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              {/* Icon */}
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                toastMessage.type === 'error' ? 'bg-red-100' :
                toastMessage.type === 'warning' ? 'bg-amber-100' :
                'bg-blue-100'
              }`}>
                <AlertCircle className={`w-8 h-8 ${
                  toastMessage.type === 'error' ? 'text-red-600' :
                  toastMessage.type === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {toastMessage.type === 'error' ? 'Có lỗi xảy ra' :
                 toastMessage.type === 'warning' ? 'Lưu ý' :
                 'Thông báo'}
              </h3>
              <p className="text-gray-600 mb-6">{toastMessage.text}</p>
              
              <Button 
                className="w-full"
                onClick={() => setToastMessage(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
