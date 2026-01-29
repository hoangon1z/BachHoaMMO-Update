'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ShoppingBag,
  Store,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface Delivery {
  id: string;
  accountData: string;
  deliveredAt: string;
  viewedAt: string | null;
  parsedData: Record<string, string>;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  deliveredQuantity: number;
  product: {
    id: string;
    title: string;
    images: string;
    accountTemplate?: {
      name: string;
      fields: string;
      fieldLabels: string;
    };
  };
  deliveries: Delivery[];
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  subtotal: number;
  commission: number;
  status: string;
  deliveredAt: string | null;
  confirmedAt: string | null;
  disputeDeadline: string | null;
  items: OrderItem[];
  seller: {
    id: string;
    name: string;
    email: string;
    sellerProfile?: {
      shopName: string;
      shopLogo: string;
    };
  };
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, checkAuth, logout, isInitialized } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && orderId) {
      fetchOrder();
    }
  }, [user, orderId]);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        router.push('/orders');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!confirm('Bạn xác nhận đã nhận được tài khoản và hài lòng với đơn hàng này?')) return;

    setIsConfirming(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Đã xác nhận đơn hàng thành công!');
        fetchOrder();
      } else {
        const data = await res.json();
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to confirm order:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const toggleAccountVisibility = (deliveryId: string) => {
    const newSet = new Set(visibleAccounts);
    if (newSet.has(deliveryId)) {
      newSet.delete(deliveryId);
    } else {
      newSet.add(deliveryId);
    }
    setVisibleAccounts(newSet);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Chờ xử lý' },
      PROCESSING: { icon: Package, color: 'bg-blue-100 text-blue-700', label: 'Đang xử lý' },
      COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Hoàn thành' },
      CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Đã hủy' },
      REFUNDED: { icon: XCircle, color: 'bg-orange-100 text-orange-700', label: 'Hoàn tiền' },
    };
    return configs[status] || configs.PENDING;
  };

  const getFieldLabel = (field: string, fieldLabels?: string) => {
    if (fieldLabels) {
      try {
        const labels = JSON.parse(fieldLabels);
        return labels[field] || field;
      } catch {}
    }
    const defaultLabels: Record<string, string> = {
      username: 'Tên đăng nhập',
      email: 'Email',
      password: 'Mật khẩu',
      '2fa': 'Mã 2FA',
      recovery_email: 'Email khôi phục',
      cookie: 'Cookie',
      key: 'Key',
      data: 'Dữ liệu',
    };
    return defaultLabels[field] || field;
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          <Link href="/orders">
            <Button className="mt-4">Quay lại</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const canConfirm = order.deliveredAt && !order.confirmedAt && order.status !== 'COMPLETED';
  const disputeDeadlinePassed = order.disputeDeadline && new Date(order.disputeDeadline) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <Link href="/orders" className="text-gray-500 hover:text-blue-600">Đơn hàng</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">{order.orderNumber}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.createdAt).toLocaleString('vi-VN')}
                </span>
                <span className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {order.seller?.sellerProfile?.shopName || order.seller?.name}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {canConfirm && (
                <Button
                  onClick={handleConfirmOrder}
                  disabled={isConfirming}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {isConfirming ? 'Đang xử lý...' : 'Xác nhận nhận hàng'}
                </Button>
              )}
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Liên hệ shop
              </Button>
            </div>
          </div>

          {/* Deadline warning */}
          {order.disputeDeadline && !order.confirmedAt && !disputeDeadlinePassed && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Hạn khiếu nại</p>
                <p className="text-yellow-700">
                  Bạn có thể khiếu nại đến {new Date(order.disputeDeadline).toLocaleString('vi-VN')}. 
                  Sau thời gian này, đơn hàng sẽ tự động hoàn tất.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Products & Accounts */}
        <div className="space-y-6">
          {order.items.map((item) => {
            let images: string[] = [];
            try {
              images = JSON.parse(item.product?.images || '[]');
            } catch {}

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Product Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      {images[0] ? (
                        <img src={images[0]} alt={item.product?.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.product?.title}</h3>
                      <p className="text-sm text-gray-500">
                        Số lượng: {item.quantity} × {formatPrice(item.price)}
                      </p>
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        Đã nhận: {item.deliveredQuantity}/{item.quantity} tài khoản
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatPrice(item.total)}</p>
                    </div>
                  </div>
                </div>

                {/* Delivered Accounts */}
                {item.deliveries.length > 0 && (
                  <div className="p-5 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      Tài khoản đã nhận ({item.deliveries.length})
                    </h4>
                    <div className="space-y-4">
                      {item.deliveries.map((delivery, idx) => {
                        const isVisible = visibleAccounts.has(delivery.id);
                        const parsedData = delivery.parsedData || { data: delivery.accountData };

                        return (
                          <div key={delivery.id} className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium text-gray-700">Tài khoản #{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleAccountVisibility(delivery.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  {isVisible ? 'Ẩn' : 'Hiện'}
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {Object.entries(parsedData).map(([field, value]) => (
                                <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                  <span className="text-sm text-gray-500">
                                    {getFieldLabel(field, item.product?.accountTemplate?.fieldLabels)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                                      {isVisible ? value : '••••••••'}
                                    </code>
                                    {isVisible && (
                                      <button
                                        onClick={() => copyToClipboard(value, `${delivery.id}-${field}`)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Copy"
                                      >
                                        <Copy className={`w-4 h-4 ${copiedId === `${delivery.id}-${field}` ? 'text-green-600' : 'text-gray-400'}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {isVisible && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => copyToClipboard(delivery.accountData, delivery.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Copy className={`w-4 h-4 ${copiedId === delivery.id ? 'text-green-600' : ''}`} />
                                  {copiedId === delivery.id ? 'Đã copy!' : 'Copy tất cả'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.deliveries.length === 0 && (
                  <div className="p-5 bg-gray-50 text-center">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Đang chờ giao hàng...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tạm tính</span>
              <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phí dịch vụ</span>
              <span className="text-gray-900">{formatPrice(order.commission)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-3 border-t">
              <span>Tổng cộng</span>
              <span className="text-blue-600 text-lg">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6">
          <Link href="/orders">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách đơn hàng
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
