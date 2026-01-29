'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Package, Clock, CheckCircle, XCircle, Eye, ShoppingBag, ChevronRight, Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

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
  };
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
  deliveredAt: string | null;
  confirmedAt: string | null;
  disputeDeadline: string | null;
  items: OrderItem[];
  seller: {
    id: string;
    name: string;
    email: string;
  };
}

export default function OrdersPage() {
  const { user, checkAuth, logout, isInitialized } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
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
            <ShoppingBag className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để xem đơn hàng</h2>
          <p className="text-gray-500 mb-6">Vui lòng đăng nhập để theo dõi đơn hàng của bạn</p>
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-500', label: 'Chờ xử lý' },
      PROCESSING: { icon: Package, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-500', label: 'Đang xử lý' },
      COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-700', iconColor: 'text-green-500', label: 'Hoàn thành' },
      CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-700', iconColor: 'text-red-500', label: 'Đã hủy' },
      REFUNDED: { icon: XCircle, color: 'bg-orange-100 text-orange-700', iconColor: 'text-orange-500', label: 'Hoàn tiền' },
      DISPUTED: { icon: XCircle, color: 'bg-red-100 text-red-700', iconColor: 'text-red-500', label: 'Tranh chấp' },
    };
    return configs[status] || configs.PENDING;
  };

  const tabs = [
    { id: 'all', label: 'Tất cả', count: orders.length },
    { id: 'PENDING', label: 'Chờ xử lý', count: orders.filter(o => o.status === 'PENDING').length },
    { id: 'PROCESSING', label: 'Đang xử lý', count: orders.filter(o => o.status === 'PROCESSING').length },
    { id: 'COMPLETED', label: 'Hoàn thành', count: orders.filter(o => o.status === 'COMPLETED').length },
  ];

  const filteredOrders = orders.filter(order => {
    if (activeTab !== 'all' && order.status !== activeTab) return false;
    if (searchQuery && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
          <span className="text-gray-900 font-medium">Đơn hàng của tôi</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
            <p className="text-gray-500 text-sm mt-1">Theo dõi và quản lý đơn hàng</p>
          </div>
          
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã đơn hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-12 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4">Đang tải đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có đơn hàng</h3>
            <p className="text-gray-500 mb-6">Bạn chưa có đơn hàng nào trong mục này</p>
            <Link href="/">
              <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl">
                Mua sắm ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const totalDelivered = order.items.reduce((sum, item) => sum + item.deliveredQuantity, 0);
              const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Order Header */}
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-sm text-gray-400">• {order.seller?.name || 'Shop'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {totalDelivered > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                          {totalDelivered}/{totalQuantity} đã giao
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                        <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-5 space-y-3">
                    {order.items.map((item) => {
                      let images: string[] = [];
                      try {
                        images = JSON.parse(item.product?.images || '[]');
                      } catch {}
                      
                      return (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {images[0] ? (
                              <img src={images[0]} alt={item.product?.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <span className="text-sm font-bold text-white">M</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{item.product?.title}</h4>
                            <p className="text-sm text-gray-500">
                              Số lượng: {item.quantity}
                              {item.deliveredQuantity > 0 && (
                                <span className="text-green-600 ml-2">• Đã nhận: {item.deliveredQuantity}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatPrice(item.total)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Order Footer */}
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-500">Tổng tiền: </span>
                      <span className="text-lg font-bold text-blue-600">{formatPrice(order.total)}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="h-10 px-4 rounded-xl border-gray-200 hover:bg-gray-100"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Xem tài khoản
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
