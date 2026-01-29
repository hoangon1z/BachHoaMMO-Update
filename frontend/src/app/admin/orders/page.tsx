'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShoppingBag, Clock, CheckCircle, XCircle, Package, User, Store, Calendar, DollarSign } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, Pagination } from '@/components/admin';
import { Button } from '@/components/ui/button';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  commission: number;
  createdAt: string;
  buyer: {
    name: string;
    email: string;
  };
  seller: {
    name: string;
    email: string;
  };
  items: Array<{
    quantity: number;
    product: {
      title: string;
    };
  }>;
  escrow?: {
    status: string;
  };
}

export default function OrdersManagementPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, filterStatus]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { variant: 'warning' | 'info' | 'success' | 'error'; icon: any; label: string }> = {
      PENDING: { variant: 'warning', icon: Clock, label: 'Chờ xử lý' },
      PROCESSING: { variant: 'info', icon: Package, label: 'Đang xử lý' },
      COMPLETED: { variant: 'success', icon: CheckCircle, label: 'Hoàn thành' },
      CANCELLED: { variant: 'error', icon: XCircle, label: 'Đã hủy' },
    };
    return config[status] || config.PENDING;
  };

  const filteredOrders = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    totalCommission: orders.reduce((sum, o) => sum + o.commission, 0),
    pending: orders.filter(o => o.status === 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý đơn hàng"
        description="Theo dõi và quản lý tất cả đơn hàng trong hệ thống"
        icon={<ShoppingBag className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Đơn hàng' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng đơn hàng"
          value={stats.total}
          icon={<ShoppingBag className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Tổng doanh thu"
          value={`${(stats.totalRevenue / 1000000).toFixed(1)}M`}
          subtitle={`${stats.totalRevenue.toLocaleString('vi-VN')}đ`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Hoa hồng (10%)"
          value={`${(stats.totalCommission / 1000000).toFixed(1)}M`}
          subtitle={`${stats.totalCommission.toLocaleString('vi-VN')}đ`}
          icon={<DollarSign className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="Chờ xử lý"
          value={stats.pending}
          icon={<Clock className="w-5 h-5" />}
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
        searchPlaceholder="Tìm kiếm theo mã đơn, buyer, seller..."
        filters={[
          {
            key: 'status',
            label: 'Tất cả trạng thái',
            value: filterStatus,
            options: [
              { value: 'PENDING', label: 'Chờ xử lý' },
              { value: 'PROCESSING', label: 'Đang xử lý' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
              { value: 'CANCELLED', label: 'Đã hủy' },
            ],
            onChange: (value) => {
              setFilterStatus(value);
              setCurrentPage(1);
            },
          },
        ]}
        showClearButton
        onClearFilters={() => {
          setFilterStatus('');
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải đơn hàng...</p>
          </div>
        </div>
      ) : paginatedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<ShoppingBag className="w-10 h-10 text-gray-400" />}
            title="Không có đơn hàng"
            description="Chưa có đơn hàng nào phù hợp với bộ lọc"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">#{order.orderNumber}</h3>
                      <StatusBadge variant={statusConfig.variant} icon={<StatusIcon className="w-3 h-3" />}>
                        {statusConfig.label}
                      </StatusBadge>
                      {order.escrow && (
                        <StatusBadge variant="warning">
                          Escrow: {order.escrow.status}
                        </StatusBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Tổng tiền</p>
                    <p className="text-2xl font-bold text-green-600">
                      {order.total.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-sm text-purple-600 mt-1">
                      Hoa hồng: {order.commission.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                </div>

                {/* Buyer & Seller Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Buyer</p>
                      <p className="font-semibold text-gray-900">{order.buyer.name}</p>
                      <p className="text-sm text-gray-500">{order.buyer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Seller</p>
                      <p className="font-semibold text-gray-900">{order.seller.name}</p>
                      <p className="text-sm text-gray-500">{order.seller.email}</p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Sản phẩm ({order.items.length})
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">• {item.product.title}</span>
                        <span className="text-gray-500">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
