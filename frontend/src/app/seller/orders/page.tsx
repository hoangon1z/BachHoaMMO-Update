'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Send,
  Truck,
  Zap,
  AlertCircle,
  ArrowUpCircle,
  Mail,
  Key,
  MessageSquare,
  RefreshCw,
  Shield,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';

interface OrderDelivery {
  id: string;
  accountData: string;
  deliveredAt: string;
  inventoryId?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  deliveredQuantity: number;
  needsManualDelivery: boolean;
  pendingDeliveryCount: number;
  isAutoDelivery: boolean;
  buyerProvidedData?: string;
  productType?: string;
  variantName?: string;
  variant?: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    title: string;
    images: string;
    autoDelivery: boolean;
    productType?: string;
  };
  deliveries?: OrderDelivery[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  commission: number;
  createdAt: string;
  needsManualDelivery: boolean;
  allDelivered: boolean;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState<{ order: Order; item: OrderItem } | null>(null);
  const [deliveryInput, setDeliveryInput] = useState('');
  const [isDelivering, setIsDelivering] = useState(false);
  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  // Warranty modal state
  const [warrantyModal, setWarrantyModal] = useState<{ order: Order; deliveryId: string; accountIndex: number } | null>(null);
  const [warrantyInput, setWarrantyInput] = useState('');
  const [warrantyReason, setWarrantyReason] = useState('');
  const [isWarrantyProcessing, setIsWarrantyProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOrders();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, searchQuery]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        fetchOrders();
        setSelectedOrder(null);
        toast.success('Thành công', 'Đã cập nhật trạng thái đơn hàng');
      } else {
        const error = await response.json();
        toast.error('Lỗi', error.message || 'Không thể cập nhật đơn hàng');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Lỗi', 'Không thể cập nhật đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal || !cancelReason.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập lý do hủy đơn');
      return;
    }

    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders/${cancelModal.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'CANCELLED',
            cancelReason: cancelReason.trim(),
          }),
        }
      );

      if (response.ok) {
        toast.success('Đã hủy đơn hàng', 'Tiền đã được hoàn cho khách hàng');
        setCancelModal(null);
        setCancelReason('');
        setSelectedOrder(null);
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error('Lỗi', error.message || 'Không thể hủy đơn hàng');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Lỗi', 'Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleManualDelivery = async () => {
    if (!deliveryModal || !deliveryInput.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập dữ liệu tài khoản');
      return;
    }

    const isUpgrade = deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE';
    const isService = deliveryModal.item.productType === 'SERVICE' || deliveryModal.item.product.productType === 'SERVICE';

    // For UPGRADE/SERVICE: single delivery (confirmation note)
    if (isUpgrade || isService) {
      setIsDelivering(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders/${deliveryModal.order.id}/items/${deliveryModal.item.id}/deliver`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderItemId: deliveryModal.item.id,
              accountData: deliveryInput.trim(),
            }),
          }
        );

        if (response.ok) {
          toast.success('Thành công', 'Đã giao thành công');
          setDeliveryModal(null);
          setDeliveryInput('');
          fetchOrders();
        } else {
          const error = await response.json();
          toast.error('Lỗi', error.message || 'Không thể giao tài khoản');
        }
      } catch (error) {
        console.error('Error delivering:', error);
        toast.error('Lỗi', 'Không thể giao tài khoản. Vui lòng thử lại.');
      } finally {
        setIsDelivering(false);
      }
      return;
    }

    // For STANDARD: bulk delivery - each line = 1 account
    const lines = deliveryInput.split('\n').filter(l => l.trim());
    const pendingCount = deliveryModal.item.pendingDeliveryCount;
    const linesToDeliver = lines.slice(0, pendingCount);

    if (linesToDeliver.length === 0) {
      toast.error('Lỗi', 'Không có dữ liệu hợp lệ để giao');
      return;
    }

    setIsDelivering(true);
    try {
      const token = localStorage.getItem('token');
      const deliveries = linesToDeliver.map(line => ({
        orderItemId: deliveryModal.item.id,
        accountData: line.trim(),
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders/${deliveryModal.order.id}/deliver`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ deliveries }),
        }
      );

      if (response.ok) {
        toast.success('Thành công', `Đã giao ${linesToDeliver.length} tài khoản thành công`);
        setDeliveryModal(null);
        setDeliveryInput('');
        fetchOrders();
        if (selectedOrder?.id === deliveryModal.order.id) {
          const updatedOrder = orders.find(o => o.id === deliveryModal.order.id);
          if (updatedOrder) setSelectedOrder(updatedOrder);
        }
      } else {
        const error = await response.json();
        toast.error('Lỗi', error.message || 'Không thể giao tài khoản');
      }
    } catch (error) {
      console.error('Error delivering:', error);
      toast.error('Lỗi', 'Không thể giao tài khoản. Vui lòng thử lại.');
    } finally {
      setIsDelivering(false);
    }
  };

  // Handle contact buyer - nhắn tin cho buyer
  const handleContactBuyer = async (order: Order) => {
    try {
      const token = localStorage.getItem('token');
      // Use POST /chat/conversations with explicit buyerId
      // The backend will auto-deduce sellerId from the authenticated user
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'BUYER_SELLER',
          buyerId: order.buyer.id,
        }),
      });

      const data = await response.json();
      if (data.success && data.conversation?._id) {
        router.push(`/seller/messages?id=${data.conversation._id}`);
      } else {
        toast.error('Lỗi', data.message || 'Không thể bắt đầu cuộc trò chuyện');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Lỗi', 'Không thể bắt đầu cuộc trò chuyện');
    }
  };

  // Handle warranty replacement
  const handleWarrantySubmit = async () => {
    if (!warrantyModal || !warrantyInput.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập dữ liệu tài khoản thay thế');
      return;
    }

    setIsWarrantyProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/orders/${warrantyModal.order.id}/warranty`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryId: warrantyModal.deliveryId,
            newAccountData: warrantyInput.trim(),
            reason: warrantyReason.trim() || undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success('Bảo hành thành công', 'Đã thay thế tài khoản mới cho khách hàng. Khách hàng sẽ nhận được thông báo.');
        setWarrantyModal(null);
        setWarrantyInput('');
        setWarrantyReason('');
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error('Lỗi', error.message || 'Không thể thực hiện bảo hành');
      }
    } catch (error) {
      console.error('Error processing warranty:', error);
      toast.error('Lỗi', 'Không thể thực hiện bảo hành. Vui lòng thử lại.');
    } finally {
      setIsWarrantyProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ xử lý</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"><Package className="w-3 h-3" /> Đang xử lý</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Đã hủy</span>;
      case 'REFUNDED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Hoàn tiền</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const getDeliveryBadge = (item: OrderItem) => {
    if (item.isAutoDelivery) {
      return (
        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-medium rounded-full flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" /> Tự động
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-medium rounded-full flex items-center gap-1">
        <Truck className="w-2.5 h-2.5" /> Thủ công
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
        <p className="text-gray-600">Xem và xử lý các đơn hàng từ khách hàng</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Chờ xử lý', value: orders.filter(o => o.status === 'PENDING').length, color: 'yellow' },
          { label: 'Đang xử lý', value: orders.filter(o => o.status === 'PROCESSING').length, color: 'blue' },
          { label: 'Hoàn thành', value: orders.filter(o => o.status === 'COMPLETED').length, color: 'green' },
          { label: 'Đã hủy', value: orders.filter(o => o.status === 'CANCELLED').length, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.color}-50 rounded-xl p-4 border border-${stat.color}-200`}>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách hàng..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="PROCESSING">Đang xử lý</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <User className="w-4 h-4" />
                      <span>{order.buyer?.name || order.buyer?.email}</span>
                      <span>•</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                    {/* Products Preview */}
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, i) => {
                        let images: string[] = [];
                        try { images = JSON.parse(item.product.images); } catch { }
                        const variantName = item.variantName || item.variant?.name;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {images[0] ? (
                                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 truncate">{item.product.title}</p>
                              {variantName && (
                                <p className="text-xs text-blue-600">Loại: {variantName}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">x{item.quantity}</span>
                          </div>
                        );
                      })}
                      {order.items.length > 3 && (
                        <span className="text-sm text-gray-500">+{order.items.length - 3} sản phẩm khác</span>
                      )}
                    </div>
                  </div>

                  {/* Amount & Delivery Status */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{order.total.toLocaleString('vi-VN')}đ</p>
                    <p className="text-sm text-gray-500">{order.items.reduce((a, b) => a + b.quantity, 0)} sản phẩm</p>
                    {order.needsManualDelivery && !order.allDelivered && (
                      <div className="mt-1 flex items-center justify-end gap-1 text-orange-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Cần giao hàng</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Chi tiết
                    </Button>
                    {/* Nhắn tin buyer */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContactBuyer(order)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Nhắn tin
                    </Button>
                    {order.needsManualDelivery && !order.allDelivered && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          const itemNeedingDelivery = order.items.find(i => i.needsManualDelivery);
                          if (itemNeedingDelivery) {
                            setDeliveryModal({ order, item: itemNeedingDelivery });
                          }
                        }}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Giao hàng
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Chi tiết đơn hàng</h2>
                  <p className="text-gray-500">#{selectedOrder.orderNumber}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Trạng thái</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Buyer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Thông tin người mua</h3>
                    <p className="text-gray-700">{selectedOrder.buyer?.name || 'N/A'}</p>
                    <p className="text-gray-500 text-sm">{selectedOrder.buyer?.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(null);
                      handleContactBuyer(selectedOrder);
                    }}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Nhắn tin
                  </Button>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Sản phẩm</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => {
                    let images: string[] = [];
                    try { images = JSON.parse(item.product.images); } catch { }
                    return (
                      <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {images[0] ? (
                              <img src={images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.product.title}</p>
                            {/* Display variant name if exists */}
                            {(item.variantName || item.variant?.name) && (
                              <p className="text-sm text-blue-600 font-medium">
                                Loại: {item.variantName || item.variant?.name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-500">x{item.quantity}</span>
                              {getDeliveryBadge(item)}
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</p>
                        </div>

                        {/* UPGRADE / SERVICE Product - Buyer's Info */}
                        {item.buyerProvidedData && (item.productType === 'UPGRADE' || item.product.productType === 'UPGRADE' || item.productType === 'SERVICE' || item.product.productType === 'SERVICE') && (
                          <div className={`mt-3 p-3 rounded-lg border ${(item.productType === 'SERVICE' || item.product.productType === 'SERVICE') ? 'bg-emerald-50 border-emerald-200' : 'bg-purple-50 border-purple-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowUpCircle className={`w-4 h-4 ${(item.productType === 'SERVICE' || item.product.productType === 'SERVICE') ? 'text-emerald-600' : 'text-purple-600'}`} />
                              <h4 className={`font-semibold text-sm ${(item.productType === 'SERVICE' || item.product.productType === 'SERVICE') ? 'text-emerald-800' : 'text-purple-800'}`}>
                                {(item.productType === 'SERVICE' || item.product.productType === 'SERVICE') ? 'Thông tin dịch vụ từ khách' : 'Tài khoản cần nâng cấp'}
                              </h4>
                            </div>
                            <div className="space-y-1.5">
                              {(() => {
                                try {
                                  const data = typeof item.buyerProvidedData === 'string'
                                    ? JSON.parse(item.buyerProvidedData)
                                    : item.buyerProvidedData;
                                  const labels: Record<string, string> = { link: 'Link/URL', username: 'Username', email: 'Email', password: 'Mật khẩu', quantity: 'Số lượng', note: 'Ghi chú' };
                                  return Object.entries(data).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-500 min-w-[80px]">{labels[key] || key}:</span>
                                      <span className="font-medium text-gray-900 select-all">{String(value)}</span>
                                    </div>
                                  ));
                                } catch {
                                  return <span className="text-gray-700 text-sm">{String(item.buyerProvidedData)}</span>;
                                }
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Delivery Status & Action */}
                        {!item.isAutoDelivery && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                <span className="text-gray-500">Đã giao: </span>
                                <span className={item.deliveredQuantity >= item.quantity ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                                  {item.deliveredQuantity}/{item.quantity}
                                </span>
                              </div>
                              {item.needsManualDelivery && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  className="bg-orange-500 hover:bg-orange-600 h-8 text-xs"
                                  onClick={() => {
                                    setSelectedOrder(null);
                                    setDeliveryModal({ order: selectedOrder, item });
                                  }}
                                >
                                  <Send className="w-3 h-3 mr-1" />
                                  Giao hàng
                                </Button>
                              )}
                              {item.deliveredQuantity >= item.quantity && (
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Đã giao đủ
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Auto delivery status */}
                        {item.isAutoDelivery && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Trạng thái giao hàng:</span>
                              <span className="text-green-600 font-medium flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Tự động từ kho
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Delivered accounts with warranty button */}
                        {item.deliveries && item.deliveries.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">Tài khoản đã giao ({item.deliveries.length})</h4>
                            </div>
                            <div className="space-y-2">
                              {item.deliveries.map((delivery, dIdx) => (
                                <div key={delivery.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-400 mb-0.5">Tài khoản #{dIdx + 1}</p>
                                    <p className="text-sm font-mono text-gray-700 truncate">{delivery.accountData}</p>
                                  </div>
                                  {(selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'COMPLETED') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="ml-2 flex-shrink-0 border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-7 text-xs"
                                      onClick={() => {
                                        setSelectedOrder(null);
                                        setWarrantyModal({
                                          order: selectedOrder,
                                          deliveryId: delivery.id,
                                          accountIndex: dIdx,
                                        });
                                      }}
                                    >
                                      <Shield className="w-3 h-3 mr-1" />
                                      Bảo hành
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{selectedOrder.subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí hoa hồng</span>
                  <span className="text-red-600">-{selectedOrder.commission.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900">
                  <span>Bạn nhận được</span>
                  <span className="text-green-600">{(selectedOrder.subtotal - selectedOrder.commission).toLocaleString('vi-VN')}đ</span>
                </div>
              </div>

              {/* Actions */}
              {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PROCESSING') && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedOrder.status === 'PENDING' && selectedOrder.allDelivered && (
                    <>
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PROCESSING')}
                        disabled={isUpdating}
                      >
                        Xác nhận xử lý
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setCancelModal(selectedOrder);
                          setSelectedOrder(null);
                        }}
                        disabled={isUpdating}
                      >
                        Hủy đơn
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'PENDING' && !selectedOrder.allDelivered && (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setCancelModal(selectedOrder);
                        setSelectedOrder(null);
                      }}
                      disabled={isUpdating}
                    >
                      Hủy đơn
                    </Button>
                  )}
                  {selectedOrder.status === 'PROCESSING' && (
                    <>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                        disabled={isUpdating}
                      >
                        Đánh dấu hoàn thành
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setCancelModal(selectedOrder);
                          setSelectedOrder(null);
                        }}
                        disabled={isUpdating}
                      >
                        Hủy đơn
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Delivery Modal */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  {/* Different title for UPGRADE vs STANDARD manual delivery */}
                  {(deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE') ? (
                    <>
                      <h2 className="text-xl font-bold text-purple-800">Xác nhận đã nâng cấp</h2>
                      <p className="text-purple-600 text-sm">Đơn hàng #{deliveryModal.order.orderNumber}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-900">Giao tài khoản thủ công</h2>
                      <p className="text-gray-500 text-sm">Đơn hàng #{deliveryModal.order.orderNumber}</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setDeliveryModal(null);
                    setDeliveryInput('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900 mb-1">{deliveryModal.item.product.title}</p>
                {/* Display variant name if exists */}
                {(deliveryModal.item.variantName || deliveryModal.item.variant?.name) && (
                  <p className="text-sm text-blue-600 font-medium mb-2">
                    Loại: {deliveryModal.item.variantName || deliveryModal.item.variant?.name}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Số lượng: {deliveryModal.item.quantity}</span>
                  <span>Đã giao: {deliveryModal.item.deliveredQuantity}</span>
                  <span className="text-orange-600 font-medium">
                    Còn lại: {deliveryModal.item.pendingDeliveryCount}
                  </span>
                </div>
              </div>

              {/* Show buyer's account info for UPGRADE products */}
              {deliveryModal.item.buyerProvidedData && (deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE' || deliveryModal.item.productType === 'SERVICE' || deliveryModal.item.product.productType === 'SERVICE') && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">
                      {(deliveryModal.item.productType === 'SERVICE' || deliveryModal.item.product.productType === 'SERVICE') ? 'Thông tin dịch vụ từ khách' : 'Tài khoản khách hàng cần upgrade'}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      try {
                        const data = typeof deliveryModal.item.buyerProvidedData === 'string'
                          ? JSON.parse(deliveryModal.item.buyerProvidedData)
                          : deliveryModal.item.buyerProvidedData;
                        const labels: Record<string, string> = { link: 'Link/URL', username: 'Username', email: 'Email', password: 'Mật khẩu', quantity: 'Số lượng', note: 'Ghi chú' };
                        return Object.entries(data).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="text-blue-600 min-w-[80px]">{labels[key] || key}:</span>
                            <span className="font-medium text-blue-900 select-all bg-white px-2 py-0.5 rounded">
                              {String(value)}
                            </span>
                          </div>
                        ));
                      } catch {
                        return <span className="text-blue-700">{String(deliveryModal.item.buyerProvidedData)}</span>;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Account Data Input - Different for UPGRADE vs STANDARD */}
              {(() => {
                const isUpgrade = deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE';
                const isService = deliveryModal.item.productType === 'SERVICE' || deliveryModal.item.product.productType === 'SERVICE';
                const isBulk = !isUpgrade && !isService;
                const lineCount = deliveryInput.split('\n').filter(l => l.trim()).length;
                const pendingCount = deliveryModal.item.pendingDeliveryCount;
                const willDeliver = Math.min(lineCount, pendingCount);

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {isUpgrade
                          ? 'Ghi chú xác nhận (VD: Đã upgrade thành công, thời hạn...)'
                          : isService
                            ? 'Ghi chú xác nhận (Đã xử lý xong dịch vụ)'
                            : 'Nhập dữ liệu tài khoản'
                        }
                      </label>
                      {isBulk && lineCount > 0 && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${willDeliver === pendingCount ? 'bg-green-100 text-green-700' : lineCount > pendingCount ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {lineCount} dòng {lineCount > pendingCount ? `(chỉ giao ${pendingCount})` : ''}
                        </span>
                      )}
                    </div>
                    <div
                      className="relative"
                      onDragOver={(e) => { if (isBulk) { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-blue-500'); } }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-blue-500'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('ring-2', 'ring-blue-500');
                        if (!isBulk) return;
                        const file = e.dataTransfer.files[0];
                        if (file && (file.name.endsWith('.txt') || file.type === 'text/plain')) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const text = ev.target?.result as string;
                            if (text) setDeliveryInput(prev => prev ? prev + '\n' + text : text);
                          };
                          reader.readAsText(file);
                        } else {
                          toast.error('Lỗi', 'Chỉ chấp nhận file .txt');
                        }
                      }}
                    >
                      <textarea
                        value={deliveryInput}
                        onChange={(e) => setDeliveryInput(e.target.value)}
                        placeholder={isUpgrade
                          ? 'VD: Đã nâng cấp Premium thành công, hết hạn 30/12/2025'
                          : isService
                            ? 'VD: Đã hoàn thành dịch vụ, giao đủ 1000 like'
                            : 'Mỗi dòng = 1 tài khoản. Hỗ trợ kéo thả file .txt\nVD:\nemail1|password1\nemail2|password2\nemail3|password3'
                        }
                        className={`w-full ${isBulk ? 'h-48' : 'h-32'} px-4 py-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono`}
                      />
                      {isBulk && !deliveryInput && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                        </div>
                      )}
                    </div>
                    {isBulk && (
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          Mỗi dòng = 1 tài khoản. Kéo thả file .txt vào ô trên để nhập nhanh.
                        </p>
                        <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                          <input
                            type="file"
                            accept=".txt,text/plain"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const text = ev.target?.result as string;
                                  if (text) setDeliveryInput(prev => prev ? prev + '\n' + text : text);
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                          Chọn file .txt
                        </label>
                      </div>
                    )}
                    {!isBulk && (
                      <p className="text-xs text-gray-500 mt-1">
                        {isUpgrade
                          ? 'Nhập ghi chú xác nhận đã upgrade thành công cho khách hàng.'
                          : 'Đã xử lý xong dịch vụ cho khách hàng.'
                        }
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDeliveryModal(null);
                    setDeliveryInput('');
                  }}
                >
                  Hủy
                </Button>
                <Button
                  className={`flex-1 ${(deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE')
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                  onClick={handleManualDelivery}
                  disabled={isDelivering || !deliveryInput.trim()}
                >
                  {isDelivering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Đang xử lý...
                    </>
                  ) : (deliveryModal.item.productType === 'UPGRADE' || deliveryModal.item.product.productType === 'UPGRADE') ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Xác nhận đã Upgrade
                    </>
                  ) : (deliveryModal.item.productType === 'SERVICE' || deliveryModal.item.product.productType === 'SERVICE') ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Xác nhận đã hoàn thành
                    </>
                  ) : (() => {
                    const lines = deliveryInput.split('\n').filter(l => l.trim()).length;
                    const pending = deliveryModal.item.pendingDeliveryCount;
                    const count = Math.min(lines, pending);
                    return (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Giao {count > 1 ? `${count} tài khoản` : 'tài khoản'}
                      </>
                    );
                  })()}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Hủy đơn hàng</h2>
                    <p className="text-gray-500 text-sm">#{cancelModal.orderNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCancelModal(null);
                    setCancelReason('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800">Lưu ý quan trọng</h4>
                    <ul className="text-sm text-red-700 mt-1 space-y-1">
                      <li>• Tiền sẽ được hoàn vào ví của khách hàng</li>
                      <li>• Khách hàng sẽ nhận được thông báo hủy đơn</li>
                      <li>• Hành động này không thể hoàn tác</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tổng tiền hoàn:</span>
                  <span className="text-lg font-bold text-red-600">{cancelModal.total.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Khách hàng:</span>
                  <span className="font-medium text-gray-900">{cancelModal.buyer?.name || cancelModal.buyer?.email}</span>
                </div>
              </div>

              {/* Cancel Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do hủy đơn <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="VD: Hết hàng, không thể thực hiện dịch vụ..."
                  className="w-full h-24 px-4 py-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lý do này sẽ được gửi cho khách hàng
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCancelModal(null);
                    setCancelReason('');
                  }}
                >
                  Quay lại
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCancelOrder}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Đang hủy...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Xác nhận hủy đơn
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Replacement Modal */}
      {warrantyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Bảo hành sản phẩm</h2>
                    <p className="text-gray-500 text-sm">Đơn hàng #{warrantyModal.order.orderNumber} - Tài khoản #{warrantyModal.accountIndex + 1}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setWarrantyModal(null);
                    setWarrantyInput('');
                    setWarrantyReason('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-emerald-700">
                    <p className="font-medium mb-1">Thay thế tài khoản</p>
                    <ul className="list-disc list-inside space-y-1 text-emerald-600">
                      <li>Tài khoản cũ sẽ được thay bằng tài khoản mới</li>
                      <li>Khách hàng sẽ nhận được thông báo</li>
                      <li>Lịch sử bảo hành sẽ được ghi nhận</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Lý do bảo hành */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do bảo hành (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={warrantyReason}
                  onChange={(e) => setWarrantyReason(e.target.value)}
                  placeholder="VD: Tài khoản bị lỗi đăng nhập, thay thế tài khoản mới"
                  className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Dữ liệu tài khoản mới */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dữ liệu tài khoản thay thế <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={warrantyInput}
                  onChange={(e) => setWarrantyInput(e.target.value)}
                  placeholder="Nhập dữ liệu tài khoản mới (VD: email|password)..."
                  className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nhập dữ liệu tài khoản mới để thay thế cho tài khoản bị lỗi
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setWarrantyModal(null);
                    setWarrantyInput('');
                    setWarrantyReason('');
                  }}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleWarrantySubmit}
                  disabled={isWarrantyProcessing || !warrantyInput.trim()}
                >
                  {isWarrantyProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Xác nhận bảo hành
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

