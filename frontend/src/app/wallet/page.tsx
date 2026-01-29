'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useRouter } from 'next/navigation';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, Clock, CheckCircle, XCircle, ChevronRight, Eye, EyeOff, Loader2, ShoppingBag, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND' | 'EARNING';
  amount: number;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  orderId?: string;
}

const quickAmounts = [50000, 100000, 200000, 500000];

export default function WalletPage() {
  const { user, checkAuth, logout, isInitialized } = useAuthStore();
  const { balance: walletBalance, pendingBalance, transactions, fetchBalance, fetchTransactions, isLoading } = useWalletStore();
  const router = useRouter();
  const [showBalance, setShowBalance] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Only fetch once when user is loaded
    if (user?.id && !hasFetched && !isLoading) {
      setHasFetched(true);
      fetchBalance(user.id);
      fetchTransactions(user.id);
    }
  }, [user?.id, hasFetched, isLoading]);

  const handleRefresh = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    await Promise.all([
      fetchBalance(user.id),
      fetchTransactions(user.id),
    ]);
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(price)) + 'đ';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const balance = walletBalance ?? user?.balance ?? 0;

  // Calculate stats from real transactions
  const calculateStats = () => {
    const now = new Date();
    const thisMonth = transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const totalDeposit = thisMonth
      .filter(tx => tx.type === 'DEPOSIT' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = thisMonth
      .filter(tx => tx.type === 'PURCHASE' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { totalDeposit, totalSpent };
  };

  const stats = calculateStats();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để xem ví</h2>
          <p className="text-gray-500 mb-6">Vui lòng đăng nhập để quản lý ví của bạn</p>
          <Button 
            onClick={() => router.push('/login')}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  const getTransactionConfig = (type: Transaction['type'], status: Transaction['status']) => {
    if (status === 'PENDING') return { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-100' };
    if (status === 'REJECTED') return { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' };
    
    const configs: Record<string, { icon: any; color: string; bgColor: string }> = {
      DEPOSIT: { icon: ArrowDownRight, color: 'text-green-500', bgColor: 'bg-green-100' },
      WITHDRAW: { icon: ArrowUpRight, color: 'text-red-500', bgColor: 'bg-red-100' },
      PURCHASE: { icon: ShoppingBag, color: 'text-blue-500', bgColor: 'bg-blue-100' },
      REFUND: { icon: ArrowDownRight, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      EARNING: { icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
    };
    return configs[type] || configs.DEPOSIT;
  };

  const getTransactionLabel = (type: Transaction['type']) => {
    const labels: Record<string, string> = {
      DEPOSIT: 'Nạp tiền',
      WITHDRAW: 'Rút tiền',
      PURCHASE: 'Mua hàng',
      REFUND: 'Hoàn tiền',
      EARNING: 'Thu nhập',
    };
    return labels[type] || type;
  };

  const filteredTransactions = transactions.filter(tx => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'deposit') return tx.type === 'DEPOSIT';
    if (activeFilter === 'purchase') return tx.type === 'PURCHASE';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Ví của tôi</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Balance & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm text-blue-100">Số dư khả dụng</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setShowBalance(!showBalance)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="mb-6">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <p className="text-3xl font-bold mb-1">
                        {showBalance ? formatPrice(balance) : '••••••••'}
                      </p>
                      {pendingBalance > 0 && (
                        <p className="text-sm text-blue-200">
                          +{formatPrice(pendingBalance)} đang chờ xử lý
                        </p>
                      )}
                    </>
                  )}
                </div>

                <Link href="/wallet/recharge">
                  <Button className="w-full h-12 bg-white hover:bg-gray-100 text-blue-700 rounded-xl font-semibold shadow-lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Nạp tiền
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Nạp nhanh</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickAmounts.map((amount) => (
                  <Link 
                    key={amount}
                    href={`/wallet/recharge?amount=${amount}`}
                    className="p-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-100 rounded-xl text-center transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{formatPrice(amount)}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Thống kê tháng này</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <ArrowDownRight className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600">Đã nạp</span>
                  </div>
                  <span className="font-semibold text-green-600">+{formatPrice(stats.totalDeposit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-600">Đã chi</span>
                  </div>
                  <span className="font-semibold text-blue-600">-{formatPrice(stats.totalSpent)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Lịch sử giao dịch</h3>
                  <button 
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'deposit', label: 'Nạp tiền' },
                    { id: 'purchase', label: 'Mua hàng' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction List */}
              <div className="divide-y divide-gray-100">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-500">Đang tải...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Chưa có giao dịch nào</p>
                    <Link href="/wallet/recharge">
                      <Button variant="outline" className="mt-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Nạp tiền ngay
                      </Button>
                    </Link>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const config = getTransactionConfig(tx.type, tx.status);
                    const TxIcon = config.icon;
                    const isPositive = tx.type === 'DEPOSIT' || tx.type === 'REFUND' || tx.type === 'EARNING';
                    
                    return (
                      <div key={tx.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                            <TxIcon className={`w-6 h-6 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-gray-900 truncate">{tx.description || getTransactionLabel(tx.type)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {tx.status === 'COMPLETED' ? 'Hoàn thành' : tx.status === 'PENDING' ? 'Đang xử lý' : 'Thất bại'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{formatDate(tx.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
                              {isPositive ? '+' : '-'}{formatPrice(tx.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
