'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ArrowDownRight, ArrowUpRight, TrendingUp, User, Calendar, Wallet, CreditCard, ShoppingCart, RefreshCw } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, Pagination, DataTable } from '@/components/admin';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) fetchTransactions();
  }, [user, filterType, filterStatus, currentPage, debouncedSearch]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const offset = (currentPage - 1) * itemsPerPage;
      params.append('limit', itemsPerPage.toString());
      params.append('offset', offset.toString());
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/transactions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setTotalItems(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeConfig = (type: string) => {
    const config: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
      DEPOSIT: { icon: ArrowDownRight, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Nạp tiền' },
      WITHDRAW: { icon: ArrowUpRight, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rút tiền' },
      PURCHASE: { icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Mua hàng' },
      REFUND: { icon: RefreshCw, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Hoàn tiền' },
      EARNING: { icon: Wallet, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Thu nhập' },
    };
    return config[type] || { icon: TrendingUp, color: 'text-gray-600', bgColor: 'bg-gray-100', label: type };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <StatusBadge variant="success" dot>Hoàn thành</StatusBadge>;
      case 'PENDING': return <StatusBadge variant="warning" dot>Chờ xử lý</StatusBadge>;
      case 'REJECTED': return <StatusBadge variant="error" dot>Từ chối</StatusBadge>;
      default: return <StatusBadge variant="default">{status}</StatusBadge>;
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const stats = {
    total: totalItems,
    deposits: transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED').reduce((sum, t) => sum + t.amount, 0),
    purchases: transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0),
    earnings: transactions.filter(t => t.type === 'EARNING').reduce((sum, t) => sum + t.amount, 0),
  };

  const columns = [
    {
      key: 'type',
      title: 'Loại',
      render: (tx: Transaction) => {
        const config = getTypeConfig(tx.type);
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <span className="font-medium text-gray-900">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: 'user',
      title: 'Người dùng',
      render: (tx: Transaction) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{tx.user.name}</p>
            <p className="text-xs text-gray-500">{tx.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Mô tả',
      render: (tx: Transaction) => (
        <p className="text-sm text-gray-600 max-w-xs truncate">{tx.description}</p>
      ),
    },
    {
      key: 'amount',
      title: 'Số tiền',
      align: 'right' as const,
      render: (tx: Transaction) => {
        const isPositive = tx.type === 'DEPOSIT' || tx.type === 'EARNING' || tx.type === 'REFUND';
        return (
          <span className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}đ
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center' as const,
      render: (tx: Transaction) => getStatusBadge(tx.status),
    },
    {
      key: 'createdAt',
      title: 'Thời gian',
      render: (tx: Transaction) => (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          {new Date(tx.createdAt).toLocaleString('vi-VN')}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tất cả giao dịch"
        description="Xem và theo dõi tất cả giao dịch trong hệ thống"
        icon={<TrendingUp className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Giao dịch' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng giao dịch"
          value={stats.total}
          icon={<TrendingUp className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Tổng nạp tiền"
          value={`${(stats.deposits / 1000000).toFixed(1)}M`}
          subtitle={`${stats.deposits.toLocaleString('vi-VN')}đ`}
          icon={<CreditCard className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Tổng mua hàng"
          value={`${(stats.purchases / 1000000).toFixed(1)}M`}
          subtitle={`${stats.purchases.toLocaleString('vi-VN')}đ`}
          icon={<ShoppingCart className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="Thu nhập seller"
          value={`${(stats.earnings / 1000000).toFixed(1)}M`}
          subtitle={`${stats.earnings.toLocaleString('vi-VN')}đ`}
          icon={<Wallet className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm theo người dùng, mô tả..."
        filters={[
          {
            key: 'type',
            label: 'Loại giao dịch',
            value: filterType,
            options: [
              { value: 'DEPOSIT', label: 'Nạp tiền' },
              { value: 'PURCHASE', label: 'Mua hàng' },
              { value: 'EARNING', label: 'Thu nhập' },
              { value: 'WITHDRAW', label: 'Rút tiền' },
              { value: 'REFUND', label: 'Hoàn tiền' },
            ],
            onChange: (value) => {
              setFilterType(value);
              setCurrentPage(1);
            },
          },
          {
            key: 'status',
            label: 'Trạng thái',
            value: filterStatus,
            options: [
              { value: 'PENDING', label: 'Chờ xử lý' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'REJECTED', label: 'Từ chối' },
            ],
            onChange: (value) => {
              setFilterStatus(value);
              setCurrentPage(1);
            },
          },
        ]}
        showClearButton
        onClearFilters={() => {
          setFilterType('');
          setFilterStatus('');
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      {/* Transactions Table */}
      <DataTable
        data={transactions}
        columns={columns}
        keyExtractor={(tx) => tx.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={<TrendingUp className="w-10 h-10 text-gray-400" />}
            title="Không có giao dịch"
            description={debouncedSearch ? `Không tìm thấy giao dịch với từ khóa "${debouncedSearch}"` : "Không tìm thấy giao dịch nào phù hợp với bộ lọc"}
          />
        }
      />

      {/* Pagination */}
      {!isLoading && transactions.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
