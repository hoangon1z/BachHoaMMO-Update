'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ShoppingBag, Clock, CheckCircle, XCircle, Package, User, Store, Calendar, DollarSign, RotateCcw, AlertTriangle, X } from 'lucide-react';
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
    variantName?: string;
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
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Refund modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, filterStatus, currentPage, debouncedSearch]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      const offset = (currentPage - 1) * itemsPerPage;
      params.append('limit', itemsPerPage.toString());
      params.append('offset', offset.toString());
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setTotalItems(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundOrder) return;
    setIsRefunding(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/orders/${refundOrder.id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: refundReason || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        setRefundModalOpen(false);
        setRefundOrder(null);
        setRefundReason('');
        fetchOrders(); // Refresh list
      } else {
        alert(`❌ Lỗi: ${data.message || 'Không thể hoàn tiền'}`);
      }
    } catch (error) {
      console.error('Refund failed:', error);
      alert('❌ Lỗi kết nối server');
    } finally {
      setIsRefunding(false);
    }
  };

  const openRefundModal = (order: Order) => {
    setRefundOrder(order);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { variant: 'warning' | 'info' | 'success' | 'error'; icon: any; label: string }> = {
      PENDING: { variant: 'warning', icon: Clock, label: 'Chờ xử lý' },
      PROCESSING: { variant: 'info', icon: Package, label: 'Đang xử lý' },
      COMPLETED: { variant: 'success', icon: CheckCircle, label: 'Hoàn thành' },
      CANCELLED: { variant: 'error', icon: XCircle, label: 'Đã hủy' },
      REFUNDED: { variant: 'error', icon: RotateCcw, label: 'Đã hoàn tiền' },
    };
    return config[status] || config.PENDING;
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const stats = {
    total: totalItems,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    totalCommission: orders.reduce((sum, o) => sum + o.commission, 0),
    pending: orders.filter(o => o.status === 'PENDING').length,
    refunded: orders.filter(o => o.status === 'REFUNDED').length,
  };

  const canRefund = (order: Order) => {
    return !['REFUNDED', 'CANCELLED'].includes(order.status);
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          title="Hoa hồng (5%)"
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
        <StatsCard
          title="Đã hoàn tiền"
          value={stats.refunded}
          icon={<RotateCcw className="w-5 h-5" />}
          color="red"
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
              { value: 'REFUNDED', label: 'Đã hoàn tiền' },
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
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<ShoppingBag className="w-10 h-10 text-gray-400" />}
            title="Không có đơn hàng"
            description={debouncedSearch ? `Không tìm thấy đơn hàng với từ khóa "${debouncedSearch}"` : "Chưa có đơn hàng nào phù hợp với bộ lọc"}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Tổng tiền</p>
                      <p className="text-2xl font-bold text-green-600">
                        {order.total.toLocaleString('vi-VN')}đ
                      </p>
                      <p className="text-sm text-purple-600 mt-1">
                        Hoa hồng: {order.commission.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    {/* Refund Button */}
                    {canRefund(order) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex-shrink-0"
                        onClick={() => openRefundModal(order)}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Hoàn tiền
                      </Button>
                    )}
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
                        <span className="text-gray-600">
                          • {item.product.title}
                          {item.variantName && (
                            <span className="ml-1 text-blue-600 font-medium">({item.variantName})</span>
                          )}
                        </span>
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
      {!isLoading && orders.length > 0 && totalPages > 1 && (
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

      {/* Refund Modal */}
      {refundModalOpen && refundOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRefundModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Hoàn tiền đơn hàng</h3>
                  <p className="text-sm text-gray-500">#{refundOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              {/* Order info summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Buyer:</span>
                  <span className="font-medium text-gray-900">{refundOrder.buyer.name} ({refundOrder.buyer.email})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Seller:</span>
                  <span className="font-medium text-gray-900">{refundOrder.seller.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Trạng thái hiện tại:</span>
                  <span className="font-medium">{getStatusConfig(refundOrder.status).label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Escrow:</span>
                  <span className="font-medium">{refundOrder.escrow?.status || 'N/A'}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-semibold text-gray-700">Số tiền hoàn:</span>
                  <span className="text-xl font-bold text-red-600">{refundOrder.total.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Products in order */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Sản phẩm trong đơn:</p>
                <div className="space-y-1">
                  {refundOrder.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex justify-between">
                      <span>
                        • {item.product.title}
                        {item.variantName && <span className="text-blue-600 ml-1">({item.variantName})</span>}
                      </span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Lưu ý khi hoàn tiền:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Số tiền sẽ được hoàn vào ví buyer ngay lập tức</li>
                      <li>Nếu escrow đang HOLDING → hủy escrow</li>
                      <li>Nếu escrow đã RELEASED → trừ lại tiền từ ví seller</li>
                      <li>Inventory sẽ được khôi phục về trạng thái AVAILABLE</li>
                      <li>Hành động này không thể hoàn tác</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Refund reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lý do hoàn tiền <span className="text-gray-400">(tùy chọn)</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="VD: Lỗi hệ thống giao sai phân loại, hàng lỗi..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRefundModalOpen(false)}
                disabled={isRefunding}
              >
                Hủy bỏ
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRefund}
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Xác nhận hoàn {refundOrder.total.toLocaleString('vi-VN')}đ
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
