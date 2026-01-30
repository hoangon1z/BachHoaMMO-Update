'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShieldCheck, Truck, CreditCard, Store } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const { user, logout, checkAuth } = useAuthStore();
  const { items, removeItem, updateQuantity, getTotalItems, getTotalPrice } = useCartStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }
    router.push('/checkout');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
        
        <div className="flex-1 flex items-center justify-center py-16 px-4">
          <div className="text-center max-w-md">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Giỏ hàng trống</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản phẩm tuyệt vời của chúng tôi!
            </p>
            <Link href="/">
              <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/25">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Tiếp tục mua
              </Button>
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // Group items by seller
  const groupedItems = items.reduce((acc, item) => {
    const sellerId = item.sellerId;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerName: item.sellerName,
        items: []
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { sellerName: string; items: typeof items }>);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <div className="flex-1 container mx-auto px-4 py-6 lg:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Giỏ hàng ({getTotalItems()})</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {Object.entries(groupedItems).map(([sellerId, group]) => (
              <div key={sellerId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Seller Header */}
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900">{group.sellerName}</span>
                </div>
                
                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <div key={item.id} className="p-5">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <span className="text-lg font-bold text-white">M</span>
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.productId}`}>
                            <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                              {item.title}
                            </h3>
                          </Link>
                          
                          <div className="flex items-center gap-3 mb-3">
                            {item.salePrice ? (
                              <>
                                <span className="text-lg font-bold text-red-500">
                                  {formatPrice(item.salePrice)}
                                </span>
                                <span className="text-sm text-gray-400 line-through">
                                  {formatPrice(item.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-bold text-blue-600">
                                {formatPrice(item.price)}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="w-12 text-center font-semibold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                disabled={item.quantity >= item.stock}
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                            
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({getTotalItems()} sản phẩm)</span>
                  <span className="font-medium text-gray-900">{formatPrice(getTotalPrice())}</span>
                </div>
                {/* <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-medium text-green-600">Miễn phí</span>
                </div> */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Tổng cộng</span>
                    <span className="text-xl font-bold text-blue-600">{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 mb-4"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Thanh toán ngay
              </Button>

              <Link href="/">
                <Button variant="outline" className="w-full h-11 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tiếp tục mua
                </Button>
              </Link>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-xs">Bảo mật thanh toán</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck className="w-5 h-5 text-blue-500" />
                    <span className="text-xs">Giao hàng nhanh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
