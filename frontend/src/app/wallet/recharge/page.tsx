'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
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
  Info,
  DollarSign,
  CreditCard,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, authFetch, API_BASE_URL } from '@/lib/config';
import { io, Socket } from 'socket.io-client';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];
const QUICK_USDT = [5, 10, 20, 50, 100, 200];

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
  bank?: string;
}

interface UsdtNetwork {
  network: string;
  address: string;
}

interface UsdtConfig {
  enabled: boolean;
  exchangeRate: number;
  networks: UsdtNetwork[];
}

interface BankInfo {
  key: string;
  name: string;
  configured: boolean;
}

const BIN_TO_BANK: Record<string, string> = {
  '970415': 'VietinBank', '970436': 'Vietcombank', '970418': 'BIDV',
  '970405': 'Agribank', '970407': 'Techcombank', '970423': 'TPBank',
  '970432': 'VPBank', '970422': 'MB Bank', '970416': 'ACB',
  '970403': 'Sacombank', '970441': 'VIB', '970426': 'MSB',
  '970448': 'OCB', '970431': 'Eximbank', '970443': 'SHB',
  '970437': 'HDBank', '970449': 'LienVietPostBank', '970440': 'SeABank',
};

const BANK_STYLES: Record<string, { gradient: string; icon: string; color: string }> = {
  bidv: {
    gradient: 'from-blue-600 to-blue-700',
    icon: '🏦',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  mbbank: {
    gradient: 'from-purple-600 to-purple-700',
    icon: '🏛️',
    color: 'border-purple-500 bg-purple-50 text-purple-700',
  },
};

const NETWORK_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  TRC20: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
  ERC20: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300' },
  BEP20: { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-300' },
};

function RechargeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, checkAuth, refreshUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'bank' | 'usdt'>('bank');

  // Bank transfer state
  const initialAmount = searchParams.get('amount') ? parseInt(searchParams.get('amount')!) : 0;
  const [amount, setAmount] = useState<number>(initialAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ success: boolean; message: string } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Bank selection state
  const [availableBanks, setAvailableBanks] = useState<BankInfo[]>([]);
  const [selectedBank, setSelectedBank] = useState<string>('bidv');

  // USDT state
  const [usdtConfig, setUsdtConfig] = useState<UsdtConfig | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [usdtAmount, setUsdtAmount] = useState<number>(0);
  const [txHash, setTxHash] = useState('');
  const [usdtSubmitting, setUsdtSubmitting] = useState(false);
  const [usdtResult, setUsdtResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      setIsCheckingAuth(false);
    };
    initAuth();
    checkPayOSConfig();
    fetchUsdtConfig();
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
        if (data.banks && Array.isArray(data.banks)) {
          setAvailableBanks(data.banks.filter((b: BankInfo) => b.configured));
          // Default to first available bank
          const firstConfigured = data.banks.find((b: BankInfo) => b.configured);
          if (firstConfigured) {
            setSelectedBank(firstConfigured.key);
          }
        } else if (data.configured) {
          // Legacy single-bank response fallback
          setAvailableBanks([{ key: 'bidv', name: 'BIDV', configured: true }]);
        }
      }
    } catch {
      setAvailableBanks([]);
    }
  };

  const fetchUsdtConfig = async () => {
    try {
      const response = await apiFetch('/wallet/usdt-config');
      if (response.ok) {
        const data = await response.json();
        setUsdtConfig(data);
        if (data.networks?.length > 0) {
          setSelectedNetwork(data.networks[0].network);
        }
      }
    } catch {
      setUsdtConfig(null);
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
            bank: selectedBank,
            returnUrl: `${window.location.origin}/wallet/recharge/success`,
            cancelUrl: `${window.location.origin}/wallet/recharge`,
          }),
        });
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentData({ ...result.data, bank: result.data.bank || selectedBank });
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

  const onPaymentConfirmed = useCallback(async () => {
    if (paymentConfirmed || !paymentData) return;
    setPaymentConfirmed(true);
    setCheckResult({ success: true, message: 'Thanh toán thành công!' });
    await refreshUser();
    setTimeout(() => router.push(`/wallet/recharge/success?orderCode=${paymentData.orderCode}&status=PAID`), 1500);
  }, [paymentConfirmed, paymentData, refreshUser, router]);

  const resolveSocketUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (envUrl) return envUrl;
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      }
      return window.location.origin;
    }
    return 'http://localhost:3001';
  };

  const checkPaymentOnce = useCallback(async () => {
    if (!paymentData || paymentConfirmed) return;
    try {
      const response = await authFetch(`/payos/check-and-approve/${paymentData.orderCode}`, { method: 'POST' });
      const result = await response.json();
      if (result.success) onPaymentConfirmed();
    } catch { }
  }, [paymentData, paymentConfirmed, onPaymentConfirmed]);

  useEffect(() => {
    if (!paymentData || paymentConfirmed) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketUrl = resolveSocketUrl();
    const socket = io(`${socketUrl}/payment`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => { setWsConnected(true); checkPaymentOnce(); });
    socket.on('disconnect', () => setWsConnected(false));
    socket.on('connect_error', () => setWsConnected(false));
    socket.on('payment:confirmed', (data: { orderCode: number }) => {
      if (data.orderCode === paymentData.orderCode) onPaymentConfirmed();
    });

    const fallbackCheck = setInterval(() => {
      if (!paymentConfirmed) checkPaymentOnce();
    }, 10000);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setWsConnected(false);
      clearInterval(fallbackCheck);
    };
  }, [paymentData, paymentConfirmed, onPaymentConfirmed, checkPaymentOnce]);

  const handleCheckPayment = async () => {
    if (!paymentData || paymentConfirmed) return;
    setIsChecking(true);
    setCheckResult(null);
    try {
      const response = await authFetch(`/payos/check-and-approve/${paymentData.orderCode}`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        setPaymentConfirmed(true);
        setCheckResult({ success: true, message: 'Thanh toán thành công!' });
        await refreshUser();
        setTimeout(() => router.push(`/wallet/recharge/success?orderCode=${paymentData.orderCode}&status=PAID`), 1500);
      } else {
        setCheckResult({ success: false, message: 'Chưa nhận được thanh toán' });
      }
    } catch {
      setCheckResult({ success: false, message: 'Lỗi kiểm tra thanh toán' });
    }
    setIsChecking(false);
  };

  // === USDT Submit ===
  const currentNetworkData = usdtConfig?.networks.find(n => n.network === selectedNetwork);

  const handleUsdtSubmit = async () => {
    if (!usdtAmount || usdtAmount <= 0) {
      setUsdtResult({ success: false, message: 'Vui lòng nhập số USDT' });
      return;
    }
    if (!txHash.trim() || txHash.trim().length < 10) {
      setUsdtResult({ success: false, message: 'Vui lòng nhập Transaction Hash hợp lệ' });
      return;
    }
    if (!selectedNetwork || !currentNetworkData) {
      setUsdtResult({ success: false, message: 'Vui lòng chọn mạng' });
      return;
    }

    setUsdtSubmitting(true);
    setUsdtResult(null);

    try {
      const response = await authFetch('/wallet/usdt-deposit', {
        method: 'POST',
        body: JSON.stringify({
          usdtAmount,
          txHash: txHash.trim(),
          network: selectedNetwork,
        }),
      });
      const result = await response.json();
      if (result.success) {
        const vndAmount = Math.round(usdtAmount * (usdtConfig?.exchangeRate || 25000));
        router.push(
          `/wallet/recharge/success?type=usdt&usdtAmount=${usdtAmount}&vndAmount=${vndAmount}&network=${selectedNetwork}`
        );
        return;
      } else {
        setUsdtResult({ success: false, message: result.error || 'Có lỗi xảy ra' });
      }
    } catch {
      setUsdtResult({ success: false, message: 'Lỗi gửi yêu cầu. Vui lòng thử lại.' });
    }
    setUsdtSubmitting(false);
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

  // Determine display bank name for payment result screen
  const paymentBankName = paymentData?.bank
    ? (paymentData.bank === 'mbbank' ? 'MB Bank' : 'BIDV')
    : (paymentData?.bin ? BIN_TO_BANK[paymentData.bin] || 'VietQR' : 'VietQR');

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header user={user} onLogout={() => { logout(); router.push('/'); }} onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)} />

      <div className="flex-1 container mx-auto px-4 py-4">
        <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
          <Link href="/wallet" className="hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Ví của tôi
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Nạp tiền</span>
        </nav>

        {!paymentData ? (
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
                    <p className="text-blue-100 text-xs">Chọn phương thức thanh toán bên dưới</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => { setActiveTab('bank'); setError(null); setUsdtResult(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'bank'
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Ngân hàng
                </button>
                {usdtConfig?.enabled && (
                  <button
                    onClick={() => { setActiveTab('usdt'); setError(null); setUsdtResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'usdt'
                      ? 'border-green-500 text-green-600 bg-green-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    USDT
                  </button>
                )}
              </div>

              {/* ===== BANK TAB ===== */}
              {activeTab === 'bank' && (
                <div className="p-5 space-y-4">
                  {availableBanks.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-yellow-800">PayOS chưa được cấu hình. Vui lòng liên hệ admin.</span>
                    </div>
                  )}

                  {/* Bank Selector */}
                  {availableBanks.length > 1 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        Chọn ngân hàng
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableBanks.map((bank) => {
                          const style = BANK_STYLES[bank.key] || BANK_STYLES.bidv;
                          const isSelected = selectedBank === bank.key;
                          return (
                            <button
                              key={bank.key}
                              onClick={() => { setSelectedBank(bank.key); setError(null); }}
                              className={`relative flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                                ? `${style.color} border-current shadow-sm ring-2 ring-current/20`
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                              <span className="text-xl">{style.icon}</span>
                              <div className="text-left">
                                <div className="text-sm font-bold">{bank.name}</div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((value) => (
                      <button
                        key={value}
                        onClick={() => { setAmount(value); setError(null); }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${amount === value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                          }`}
                      >
                        {(value / 1000)}K
                      </button>
                    ))}
                  </div>

                  {amount >= 10000 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700">Số tiền nạp:</span>
                      <span className="font-bold text-blue-900">{formatPrice(amount)}</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleCreatePayment}
                    disabled={!amount || amount < 10000 || isSubmitting || availableBanks.length === 0}
                    className="w-full h-11"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...</>
                    ) : (
                      <><QrCode className="w-4 h-4 mr-2" /> Tạo mã thanh toán</>
                    )}
                  </Button>
                </div>
              )}

              {/* ===== USDT TAB ===== */}
              {activeTab === 'usdt' && usdtConfig && (
                <div className="p-5 space-y-4">
                  {/* Network Selector */}
                  {usdtConfig.networks.length > 1 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Chọn mạng</label>
                      <div className="flex flex-wrap gap-2">
                        {usdtConfig.networks.map((net) => {
                          const colors = NETWORK_COLORS[net.network] || { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' };
                          return (
                            <button
                              key={net.network}
                              onClick={() => setSelectedNetwork(net.network)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border-2 ${selectedNetwork === net.network
                                ? `${colors.bg} ${colors.text} border-current ring-2 ${colors.ring} shadow-sm`
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              {net.network}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Wallet Address + QR */}
                  {currentNetworkData && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700 block">
                        Gửi USDT đến địa chỉ ví ({selectedNetwork})
                      </label>

                      {/* QR Code */}
                      <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-xl shadow-md border">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentNetworkData.address)}`}
                            alt={`QR ${selectedNetwork}`}
                            className="w-[160px] h-[160px]"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">Quét QR bằng ví crypto hoặc copy địa chỉ bên dưới</p>

                      {/* Address */}
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <code className="flex-1 text-xs font-mono text-gray-800 break-all select-all">
                          {currentNetworkData.address}
                        </code>
                        <button
                          onClick={() => copyToClipboard(currentNetworkData.address, 'wallet')}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                          title="Copy địa chỉ ví"
                        >
                          {copied === 'wallet' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Exchange rate */}
                  <div className="flex items-center gap-3">
                    {usdtConfig.networks.length === 1 && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${(NETWORK_COLORS[selectedNetwork] || { bg: 'bg-gray-100', text: 'text-gray-700' }).bg
                        } ${(NETWORK_COLORS[selectedNetwork] || { bg: 'bg-gray-100', text: 'text-gray-700' }).text}`}>
                        {selectedNetwork}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Tỷ giá: 1 USDT = {usdtConfig.exchangeRate.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {/* USDT Amount */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Số USDT đã gửi</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={usdtAmount || ''}
                      onChange={(e) => { setUsdtAmount(parseFloat(e.target.value) || 0); setUsdtResult(null); }}
                      placeholder="Nhập số USDT (ví dụ: 10)"
                      className="h-11 text-base"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_USDT.map((value) => (
                      <button
                        key={value}
                        onClick={() => { setUsdtAmount(value); setUsdtResult(null); }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${usdtAmount === value
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                          }`}
                      >
                        {value} USDT
                      </button>
                    ))}
                  </div>

                  {usdtAmount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700">Số tiền nhận được:</span>
                      <span className="font-bold text-green-900">
                        {formatPrice(Math.round(usdtAmount * usdtConfig.exchangeRate))}
                      </span>
                    </div>
                  )}

                  {/* Transaction Hash */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Transaction Hash (TxHash)</label>
                    <Input
                      type="text"
                      value={txHash}
                      onChange={(e) => { setTxHash(e.target.value); setUsdtResult(null); }}
                      placeholder="Nhập mã giao dịch từ ví crypto"
                      className="h-11 text-base font-mono"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Hướng dẫn:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Chọn mạng và gửi USDT đến địa chỉ ví tương ứng</li>
                        <li>Copy <strong>Transaction Hash</strong> từ ví crypto</li>
                        <li>Nhập số USDT và TxHash rồi bấm &quot;Gửi yêu cầu&quot;</li>
                        <li>Admin sẽ kiểm tra và duyệt trong vòng vài phút</li>
                      </ol>
                    </div>
                  </div>

                  {usdtResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${usdtResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                      {usdtResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {usdtResult.message}
                    </div>
                  )}

                  <Button
                    onClick={handleUsdtSubmit}
                    disabled={!usdtAmount || usdtAmount <= 0 || !txHash.trim() || usdtSubmitting || !currentNetworkData}
                    className="w-full h-11 bg-green-600 hover:bg-green-700"
                  >
                    {usdtSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                    ) : (
                      <><DollarSign className="w-4 h-4 mr-2" /> Gửi yêu cầu nạp USDT</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* === QR Bank transfer === */
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/2 p-5 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white border-b md:border-b-0 md:border-r">
                  <div className="p-3 bg-white rounded-xl shadow-md border">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentData.qrCode)}`}
                      alt="QR Code"
                      className="w-[180px] h-[180px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">Mở App Ngân hàng → Quét mã QR</p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    {wsConnected ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-600">Kết nối real-time • Đang chờ thanh toán...</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        <span className="text-blue-600">Đang chờ thanh toán...</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="md:w-1/2 p-5">
                  <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">Thông tin chuyển khoản</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-blue-700">Số tiền</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-900">{formatPrice(paymentData.amount)}</span>
                        <button onClick={() => copyToClipboard(paymentData.amount.toString(), 'amount')} className="p-1 hover:bg-blue-100 rounded">
                          <Copy className={`w-3.5 h-3.5 ${copied === 'amount' ? 'text-green-600' : 'text-blue-400'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm text-amber-700">Nội dung CK</span>
                      <div className="flex items-center gap-2">
                        <code className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-sm">{paymentData.description}</code>
                        <button onClick={() => copyToClipboard(paymentData.description, 'content')} className="p-1 hover:bg-amber-100 rounded">
                          <Copy className={`w-3.5 h-3.5 ${copied === 'content' ? 'text-green-600' : 'text-amber-500'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                      <div className="flex justify-between">
                        <span>Ngân hàng:</span>
                        <span className="font-medium text-gray-700">{paymentBankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Số TK:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">{paymentData.accountNumber}</span>
                          <button onClick={() => copyToClipboard(paymentData.accountNumber, 'accountNumber')} className="p-0.5 hover:bg-gray-100 rounded">
                            <Copy className={`w-3 h-3 ${copied === 'accountNumber' ? 'text-green-600' : 'text-gray-400'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Chủ TK:</span>
                        <span className="font-medium text-gray-700">{paymentData.accountName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Nhập <strong>chính xác</strong> số tiền và nội dung CK để được xử lý tự động</span>
                  </div>
                  {checkResult && (
                    <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-lg text-xs ${checkResult.success ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {checkResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {checkResult.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex border-t divide-x">
                <a href={paymentData.checkoutUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Mở trang PayOS
                </a>
                <button onClick={handleCheckPayment} disabled={isChecking} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Kiểm tra thanh toán
                </button>
              </div>

              <div className="flex border-t divide-x text-sm">
                <Link href="/wallet" className="flex-1 py-2.5 text-center text-gray-600 hover:bg-gray-50 transition-colors">← Về ví</Link>
                <button onClick={() => { setPaymentData(null); setAmount(0); setCheckResult(null); }} className="flex-1 py-2.5 text-center text-gray-600 hover:bg-gray-50 transition-colors">Nạp số khác</button>
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
