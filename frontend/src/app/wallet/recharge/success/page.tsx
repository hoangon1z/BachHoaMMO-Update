'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Button } from '@/components/ui/button';
import { CheckCircle, Wallet, ArrowRight, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, []);

  // Fetch balance and refresh user data after payment success
  useEffect(() => {
    if (user?.id) {
      // Wait a bit for webhook to process, then fetch updated data
      const timer = setTimeout(async () => {
        await fetchBalance(user.id);
        await refreshUser(); // Refresh user to update balance in header
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
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Thanh toán thành công!</h1>
              <p className="text-green-100">Số tiền đã được cộng vào ví của bạn</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Order Info */}
              {orderCode && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Mã giao dịch</p>
                  <p className="font-mono font-semibold">{orderCode}</p>
                </div>
              )}

              {/* Balance */}
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

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Đang xử lý thanh toán...</p>
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
