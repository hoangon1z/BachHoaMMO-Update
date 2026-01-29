'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wallet, 
  ArrowLeft, 
  Copy, 
  QrCode,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, authFetch } from '@/lib/config';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

// Loading fallback
function RechargeLoading() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

interface PaymentData {
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  transactionId: string;
  bin?: string;
}

// Map BIN to bank name
const BIN_TO_BANK: Record<string, string> = {
  '970415': 'VietinBank', '970436': 'Vietcombank', '970418': 'BIDV',
  '970405': 'Agribank', '970407': 'Techcombank', '970423': 'TPBank',
  '970432': 'VPBank', '970422': 'MB Bank', '970416': 'ACB',
  '970403': 'Sacombank', '970441': 'VIB', '970426': 'MSB',
  '970448': 'OCB', '970431': 'Eximbank', '970443': 'SHB',
  '970437': 'HDBank', '970449': 'LienVietPostBank', '970440': 'SeABank',
};

function RechargeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth, refreshUser } = useAuthStore();
  
  const initialAmount = searchParams.get('amount') ? parseInt(searchParams.get('amount')!) : 0;
  const [amount, setAmount] = useState<number>(initialAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPayOSConfigured, setIsPayOSConfigured] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsCheckingAuth(false);
    };
    initAuth();
    checkPayOSConfig();
  }, []);

  useEffect(() => {
    if (!isCheckingAuth && !user) {
      router.push('/login?redirect=/wallet/recharge');
    }
  }, [user, isCheckingAuth]);

  const checkPayOSConfig = async () => {
    try {
      const response = await apiFetch('/payos/config-status');
      if (response.ok) {
        const data = await response.json();
        setIsPayOSConfigured(data.configured);
      }
    } catch {
      setIsPayOSConfigured(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!amount || amount < 10000) {
      setError('Số tiền nạp tối thiểu là 10.000đ');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await authFetch('/payos/create-payment', {
          method: 'POST',
          body: JSON.stringify({ 
            amount,
            returnUrl: `${window.location.origin}/wallet/recharge/success`,
            cancelUrl: `${window.location.origin}/wallet/recharge`,
          }),
        });
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentData(result.data);
          return;
        }
        throw new Error(result.message || 'Không thể tạo thanh toán');
      } catch (err: any) {
        if (attempt === 2) setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại!');
        else await new Promise(r => setTimeout(r, 1000));
      }
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (paymentData) setIsSubmitting(false);
  }, [paymentData]);

  // Auto-polling
  useEffect(() => {
    if (!paymentData) return;
    const pollInterval = setInterval(async () => {
      try {
        const response = await authFetch(`/payos/check-and-approve/${paymentData.orderCode}`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
          setCheckResult({ success: true, message: 'Thanh toán thành công!' });
          await refreshUser();
          setTimeout(() => router.push(`/wallet/recharge/success?orderCode=${paymentData.orderCode}&status=PAID`), 1000);
          clearInterval(pollInterval);
        }
      } catch {}
    }, 3000);
    const timeout = setTimeout(() => clearInterval(pollInterval), 15 * 60 * 1000);
    return () => { clearInterval(pollInterval); clearTimeout(timeout); };
  }, [paymentData]);

  const handleCheckPayment = async () => {
    if (!paymentData) return;
    setIsChecking(true);
    setCheckResult(null);
    try {
      const response = await authFetch(`/payos/check-and-approve/${paymentData.orderCode}`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        setCheckResult({ success: true, message: 'Thanh toán thành công!' });
        await refreshUser();
        setTimeout(() => router.push(`/wallet/recharge/success?orderCode=${paymentData.orderCode}&status=PAID`), 1000);
      } else {
        setCheckResult({ success: false, message: 'Chưa nhận được thanh toán' });
      }
    } catch {
      setCheckResult({ success: false, message: 'Lỗi kiểm tra thanh toán' });
    }
    setIsChecking(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-secondary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header user={user} onLogout={() => { logout(); router.push('/'); }} onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)} />
      
      <div className="flex-1 container mx-auto px-4 py-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <Link href="/wallet" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Ví của tôi
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Nạp tiền</span>
        </nav>

        {/* PayOS Warning */}
        {isPayOSConfigured === false && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800">PayOS chưa được cấu hình. Vui lòng liên hệ admin.</span>
          </div>
        )}

        {!paymentData ? (
          /* === FORM NẠP TIỀN === */
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg">Nạp tiền vào ví</h1>
                    <p className="text-blue-100 text-xs">Quét QR • Tự động cộng tiền</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Input */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Số tiền cần nạp</label>
                  <Input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => { setAmount(parseInt(e.target.value) || 0); setError(null); }}
                    placeholder="Nhập số tiền (tối thiểu 10.000đ)"
                    className="h-11 text-base"
                  />
                </div>

                {/* Quick Amounts - Compact */}
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      onClick={() => { setAmount(value); setError(null); }}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        amount === value 
                          ? 'bg-primary text-white border-primary' 
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      {(value / 1000)}K
                    </button>
                  ))}
                </div>

                {/* Preview */}
                {amount >= 10000 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700">Số tiền nạp:</span>
                    <span className="font-bold text-blue-900">{formatPrice(amount)}</span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleCreatePayment}
                  disabled={!amount || amount < 10000 || isSubmitting || isPayOSConfigured === false}
                  className="w-full h-11"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...</>
                  ) : (
                    <><QrCode className="w-4 h-4 mr-2" /> Tạo mã thanh toán</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* === HIỂN THỊ QR === */
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* 2 Column Layout */}
              <div className="md:flex">
                {/* Left: QR Code */}
                <div className="md:w-1/2 p-5 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white border-b md:border-b-0 md:border-r">
                  <div className="p-3 bg-white rounded-xl shadow-md border">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentData.qrCode)}`}
                      alt="QR Code"
                      className="w-[180px] h-[180px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Mở App Ngân hàng → Quét mã QR
                  </p>
                  
                  {/* Auto polling indicator */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-blue-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang chờ thanh toán...</span>
                  </div>
                </div>

                {/* Right: Payment Info */}
                <div className="md:w-1/2 p-5">
                  <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">Thông tin chuyển khoản</h3>
                  
                  <div className="space-y-3">
                    {/* Amount */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700">Số tiền</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900">{formatPrice(paymentData.amount)}</span>
                        <button onClick={() => copyToClipboard(paymentData.amount.toString(), 'amount')} className="p-1 hover:bg-blue-100 rounded">
                          <Copy className={`w-3.5 h-3.5 ${copied === 'amount' ? 'text-green-600' : 'text-blue-400'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm text-amber-700">Nội dung CK</span>
                      <div className="flex items-center gap-2">
                        <code className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-sm">{paymentData.description}</code>
                        <button onClick={() => copyToClipboard(paymentData.description, 'content')} className="p-1 hover:bg-amber-100 rounded">
                          <Copy className={`w-3.5 h-3.5 ${copied === 'content' ? 'text-green-600' : 'text-amber-500'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Bank Info - Compact */}
                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                      <div className="flex justify-between">
                        <span>Ngân hàng:</span>
                        <span className="font-medium text-gray-700">{paymentData.bin && BIN_TO_BANK[paymentData.bin] || 'VietQR'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chủ TK:</span>
                        <span className="font-medium text-gray-700">{paymentData.accountName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning Note */}
                  <div className="flex items-start gap-2 mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Nhập <strong>chính xác</strong> số tiền và nội dung CK để được xử lý tự động</span>
                  </div>

                  {/* Check Result */}
                  {checkResult && (
                    <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-lg text-xs ${
                      checkResult.success ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {checkResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {checkResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t divide-x">
                <a 
                  href={paymentData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Mở trang PayOS
                </a>
                <button
                  onClick={handleCheckPayment}
                  disabled={isChecking}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Kiểm tra thanh toán
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="flex border-t divide-x text-sm">
                <Link href="/wallet" className="flex-1 py-2.5 text-center text-gray-600 hover:bg-gray-50 transition-colors">
                  ← Về ví
                </Link>
                <button onClick={() => { setPaymentData(null); setAmount(0); setCheckResult(null); }} className="flex-1 py-2.5 text-center text-gray-600 hover:bg-gray-50 transition-colors">
                  Nạp số khác
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function RechargePage() {
  return (
    <Suspense fallback={<RechargeLoading />}>
      <RechargeContent />
    </Suspense>
  );
}
