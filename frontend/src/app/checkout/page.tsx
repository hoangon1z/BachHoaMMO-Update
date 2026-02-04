'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useWalletStore } from '@/store/walletStore';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  ShoppingBag, 
  CheckCircle, 
  ChevronRight,
  Package,
  Shield,
  ArrowLeft,
  AlertTriangle,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/config';

const STEPS = [
  { id: 1, name: 'Giỏ hàng', icon: ShoppingBag },
  { id: 2, name: 'Thanh toán', icon: Wallet },
  { id: 3, name: 'Xác nhận', icon: CheckCircle },
];

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, logout, checkAuth } = useAuthStore();
  const { items, getTotalItems, getTotalPrice, clearCart } = useCartStore();
  const { balance, fetchBalance } = useWalletStore();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsCheckingAuth(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      if (!user) {
        router.push('/login?redirect=/checkout');
        return;
      }
      fetchBalance(user.id);
    }
  }, [user, isCheckingAuth]);

  useEffect(() => {
    if (items.length === 0 && !orderSuccess && !isCheckingAuth) {
      router.push('/cart');
    }
  }, [items, orderSuccess, isCheckingAuth]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const totalAmount = getTotalPrice();
  const currentBalance = balance || 0;
  const insufficientBalance = currentBalance < totalAmount;

  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePlaceOrder = async () => {
    if (insufficientBalance) {
      toast.error('Số dư không đủ', 'Vui lòng nạp thêm tiền vào ví');
      return;
    }

    // Validate items before checkout
    const invalidItems = items.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast.error('Lỗi giỏ hàng', 'Có sản phẩm với số lượng không hợp lệ');
      return;
    }

    if (totalAmount <= 0) {
      toast.error('Lỗi đơn hàng', 'Tổng đơn hàng phải lớn hơn 0');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await authFetch('/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.originalPrice || item.price,
            // Include buyer provided data for UPGRADE products
            buyerProvidedData: item.buyerProvidedData 
              ? JSON.stringify(item.buyerProvidedData) 
              : undefined,
          })),
          total: totalAmount,
          notes: note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const data = await response.json();
      
      clearCart();
      setOrderId(data.orders?.[0]?.orderNumber || data.id || '');
      setOrderSuccess(true);
      setCurrentStep(3);
      toast.success('Đặt hàng thành công!', 'Cảm ơn bạn đã mua hàng');
      
    } catch (error: any) {
      console.error('Order error:', error);
      toast.error('Đặt hàng thất bại', error.message || 'Vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <main className="flex-1 py-6 lg:py-10">
        <div className="max-w-5xl mx-auto px-4">
          {/* Steps Progress */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-center">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-1.5 sm:gap-2 ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    <div className={`
                      w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold
                      transition-all duration-300
                      ${currentStep > step.id 
                        ? 'bg-green-500 text-white' 
                        : currentStep === step.id 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}>
                      {currentStep > step.id ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <span className={`hidden sm:block font-medium text-sm lg:text-base ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-12 lg:w-20 h-0.5 mx-1.5 sm:mx-2 lg:mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Order Summary - Shown at top on mobile */}
          <div className="lg:hidden mb-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{getTotalItems()} sản phẩm</p>
                  <p className="text-lg font-bold text-blue-600">
                    {totalAmount.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.productId} className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border-2 border-white">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 border-2 border-white">
                      +{items.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Step 1: Cart Review */}
              {currentStep === 1 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-4 lg:p-5 border-b border-gray-100">
                    <h2 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      Kiểm tra giỏ hàng
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <div key={item.productId} className="p-4 lg:p-5 flex gap-3 lg:gap-4">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm lg:text-base line-clamp-2">{item.title}</h3>
                          <p className="text-xs lg:text-sm text-gray-500 mt-1">Số lượng: {item.quantity}</p>
                          <p className="text-blue-600 font-semibold mt-1 lg:mt-2 text-sm lg:text-base">
                            {((item.originalPrice || item.price) * item.quantity).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 2 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-4 lg:p-5 border-b border-gray-100">
                    <h2 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      Thanh toán bằng số dư ví
                    </h2>
                  </div>
                  <div className="p-4 lg:p-5 space-y-4">
                    {/* Wallet Balance */}
                    <div className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl border-2 border-blue-500 bg-blue-50">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm lg:text-base">Ví BachHoaMMO</p>
                        <p className="text-xs lg:text-sm text-gray-500">
                          Số dư: <span className={insufficientBalance ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {currentBalance.toLocaleString('vi-VN')}đ
                          </span>
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 flex-shrink-0" />
                    </div>

                    {insufficientBalance && (
                      <div className="p-3 lg:p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-700 font-medium text-sm lg:text-base">Số dư không đủ!</p>
                        <p className="text-xs lg:text-sm text-red-600 mt-1">
                          Bạn cần nạp thêm {(totalAmount - currentBalance).toLocaleString('vi-VN')}đ để thanh toán
                        </p>
                        <Link href="/wallet/recharge">
                          <Button size="sm" className="mt-3 bg-red-600 hover:bg-red-700 text-xs lg:text-sm">
                            Nạp tiền ngay
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Note */}
                    <div className="space-y-2">
                      <label className="text-xs lg:text-sm font-medium text-gray-700">Ghi chú (tùy chọn)</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ghi chú cho đơn hàng (nếu có)"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>

                    {/* Security Note */}
                    <div className="flex items-start gap-3 p-3 lg:p-4 bg-green-50 rounded-xl">
                      <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800 text-sm lg:text-base">Thanh toán an toàn</p>
                        <p className="text-xs lg:text-sm text-green-700">
                          Tiền của bạn được giữ an toàn trong Escrow và chỉ được chuyển cho người bán sau khi bạn xác nhận nhận hàng.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {currentStep === 3 && orderSuccess && (
                <div className="space-y-4">
                  {/* Success Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-8 text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                      <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-green-600" />
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Đặt hàng thành công!</h2>
                    <p className="text-sm lg:text-base text-gray-600 mb-4 lg:mb-6">
                      Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.
                    </p>
                    {orderId && (
                      <p className="text-xs lg:text-sm text-gray-500 mb-4 lg:mb-6">
                        Mã đơn hàng: <span className="font-semibold text-gray-900 break-all">{orderId}</span>
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link href="/orders" className="w-full sm:w-auto">
                        <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Xem đơn hàng
                        </Button>
                      </Link>
                      <Link href="/" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full">
                          Tiếp tục mua
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Important Notice - Data Retention */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-amber-800 text-sm lg:text-base mb-2">
                          ⚠️ LƯU Ý QUAN TRỌNG
                        </h3>
                        <p className="text-amber-700 text-xs lg:text-sm leading-relaxed mb-3">
                          Tất cả Data của chúng tôi sẽ <strong>chỉ được lưu trong 3 ngày</strong>. Do số lượng hàng mua lớn, server sẽ quá tải. Rất mong quý khách thông cảm và <strong>tải đơn hàng của mình xuống ngay sau khi mua</strong>.
                        </p>
                        <Link href="/orders" className="inline-flex items-center gap-1 text-amber-800 font-semibold text-xs lg:text-sm hover:underline">
                          <Download className="w-4 h-4" />
                          Tải đơn hàng ngay
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Important Notice - Security */}
                  <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 lg:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-red-800 text-sm lg:text-base mb-2">
                          🔐 LƯU Ý CỰC KÌ QUAN TRỌNG
                        </h3>
                        <p className="text-red-700 text-xs lg:text-sm leading-relaxed">
                          Để tránh xảy ra mất mát tài sản, anh/em khi mua tài khoản về <strong>hãy đổi mật khẩu ngay</strong>. Chú ý: Bên tớ <strong>chỉ bảo hành trong 24h</strong>. Chúng tớ sẽ <strong>không chịu trách nhiệm</strong> nếu các bạn không đổi mật khẩu mà xảy ra mất tài sản.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {!orderSuccess && (
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={currentStep === 1 ? () => router.push('/cart') : handlePrevStep}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="truncate">{currentStep === 1 ? 'Quay lại giỏ hàng' : 'Quay lại'}</span>
                  </Button>
                  
                  {currentStep === 1 ? (
                    <Button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700 gap-2 w-full sm:w-auto">
                      <span className="truncate">Tiếp tục thanh toán</span>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    </Button>
                  ) : currentStep === 2 ? (
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isProcessing || insufficientBalance}
                      className="bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <span className="truncate">Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Xác nhận thanh toán</span>
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Order Summary Sidebar - Hidden on mobile (shown at top instead) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 sticky top-24">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Tóm tắt đơn hàng</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số lượng sản phẩm</span>
                    <span className="font-medium">{getTotalItems()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tạm tính</span>
                    <span className="font-medium">{totalAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {/* <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí vận chuyển</span>
                    <span className="font-medium text-green-600">Miễn phí</span>
                  </div> */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Tổng cộng</span>
                      <span className="text-xl font-bold text-blue-600">
                        {totalAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                {currentStep !== 1 && (
                  <div className="border-t border-gray-100">
                    <div className="p-5">
                      <p className="text-sm text-gray-500 mb-3">{items.length} sản phẩm</p>
                      <div className="flex flex-wrap gap-2">
                        {items.slice(0, 4).map((item) => (
                          <div key={item.productId} className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                            {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                          </div>
                        ))}
                        {items.length > 4 && (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
                            +{items.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
