'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet, ArrowRight, Loader2, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth, refreshUser } = useAuthStore();
  const { fetchBalance, balance } = useWalletStore();
  const [isLoading, setIsLoading] = useState(true);

  const orderCode = searchParams.get('orderCode');
  const status = searchParams.get('status');
  const type = searchParams.get('type'); // 'usdt' or null (bank)
  const usdtAmountParam = searchParams.get('usdtAmount');
  const vndAmountParam = searchParams.get('vndAmount');
  const networkParam = searchParams.get('network');

  const isUsdt = type === 'usdt';

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user?.id && !isUsdt) {
      const timer = setTimeout(async () => {
        await fetchBalance(user.id);
        await refreshUser();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <div className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl border shadow-lg overflow-hidden">
            {/* Header */}
            {isUsdt ? (
              /* USDT Pending Header */
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Yêu cầu đã được gửi!</h1>
                <p className="text-amber-100">Vui lòng đợi admin xác nhận giao dịch USDT</p>
              </div>
            ) : (
              /* Bank Success Header */
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
                <p className="text-green-100">Số tiền đã được cộng vào ví của bạn</p>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* USDT Info */}
              {isUsdt && (
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Thông tin giao dịch</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      {usdtAmountParam && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số USDT:</span>
                          <span className="font-bold text-green-700">{usdtAmountParam} USDT</span>
                        </div>
                      )}
                      {networkParam && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mạng:</span>
                          <span className="font-bold">{networkParam}</span>
                        </div>
                      )}
                      {vndAmountParam && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số tiền VND:</span>
                          <span className="font-bold text-blue-700">{formatPrice(parseInt(vndAmountParam))}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 mb-1">Đang chờ duyệt</p>
                        <p className="text-sm text-amber-700">
                          Admin sẽ kiểm tra Transaction Hash và xác nhận giao dịch.
                          Thời gian xử lý thường từ <strong>5-30 phút</strong>.
                          Số tiền sẽ tự động cộng vào ví khi được duyệt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Transfer Info */}
              {!isUsdt && orderCode && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Mã giao dịch</p>
                  <p className="font-mono font-semibold">{orderCode}</p>
                </div>
              )}

              {/* Balance (only for bank - already confirmed) */}
              {!isUsdt && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Đang cập nhật...</span>
                        </div>
                      ) : (
                        <p className="text-2xl font-bold text-primary">{formatPrice(balance)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Link href="/wallet" className="block">
                  <Button className="w-full h-12">
                    <Wallet className="w-5 h-5 mr-2" />
                    Về ví của tôi
                  </Button>
                </Link>
                <Link href="/explore" className="block">
                  <Button variant="outline" className="w-full h-12">
                    Tiếp tục mua sắm
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Đang xử lý...</p>
      </div>
    </div>
  );
}

export default function RechargeSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
