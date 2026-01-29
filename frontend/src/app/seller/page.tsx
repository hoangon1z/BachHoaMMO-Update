'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardData {
  store: {
    id: string;
    shopName: string;
    rating: number;
    totalSales: number;
    isVerified: boolean;
    balance: number;
  };
  stats: {
    products: { total: number; active: number };
    orders: { total: number; pending: number; completedThisMonth: number; growth: number };
    revenue: { thisMonth: number; lastMonth: number; growth: number };
    complaints: { open: number };
    withdrawals: { pending: number };
  };
  recentOrders: any[];
  topProducts: any[];
}

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('NOT_FOUND');
        } else {
          throw new Error('Failed to fetch dashboard');
        }
        return;
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error === 'NOT_FOUND') {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Chưa có cửa hàng</h1>
          <p className="text-gray-600 mb-6">
            Bạn cần tạo cửa hàng trước khi có thể bắt đầu bán hàng trên nền tảng.
          </p>
          <Link href="/seller/settings">
            <Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
              Tạo cửa hàng ngay
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Có lỗi xảy ra</h1>
          <p className="text-gray-600 mb-6">Không thể tải dữ liệu dashboard. Vui lòng thử lại.</p>
          <Button onClick={fetchDashboard} className="h-12 px-6">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Doanh thu tháng này',
      value: `${dashboard.stats.revenue.thisMonth.toLocaleString('vi-VN')}đ`,
      change: dashboard.stats.revenue.growth,
      icon: Wallet,
      color: 'blue',
    },
    {
      label: 'Đơn hàng hoàn thành',
      value: dashboard.stats.orders.completedThisMonth,
      change: dashboard.stats.orders.growth,
      icon: ShoppingBag,
      color: 'green',
    },
    {
      label: 'Sản phẩm đang bán',
      value: dashboard.stats.products.active,
      subtext: `/ ${dashboard.stats.products.total} tổng`,
      icon: Package,
      color: 'purple',
    },
    {
      label: 'Đơn chờ xử lý',
      value: dashboard.stats.orders.pending,
      urgent: dashboard.stats.orders.pending > 0,
      icon: Clock,
      color: 'orange',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const bgColorMap: Record<string, string> = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
    orange: 'bg-orange-50',
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Xin chào, {dashboard.store.shopName}!</p>
        </div>
        <div className="flex gap-3">
          <Link href="/seller/products/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Package className="w-4 h-4 mr-2" />
              Thêm sản phẩm
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className={`w-11 h-11 ${bgColorMap[stat.color]} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color === 'blue' ? 'text-blue-600' : stat.color === 'green' ? 'text-green-600' : stat.color === 'purple' ? 'text-purple-600' : 'text-orange-600'}`} />
              </div>
              {stat.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm font-medium ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(stat.change)}%
                </div>
              )}
              {stat.urgent && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                  Cần xử lý
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stat.label}
                {stat.subtext && <span className="text-gray-400"> {stat.subtext}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(dashboard.stats.complaints.open > 0 || dashboard.stats.orders.pending > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboard.stats.complaints.open > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-800">
                  {dashboard.stats.complaints.open} khiếu nại đang chờ
                </p>
                <p className="text-sm text-red-600">Vui lòng xử lý sớm để tránh ảnh hưởng đến đánh giá</p>
              </div>
              <Link href="/seller/complaints">
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                  Xem ngay
                </Button>
              </Link>
            </div>
          )}
          {dashboard.stats.orders.pending > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-orange-800">
                  {dashboard.stats.orders.pending} đơn hàng chờ xử lý
                </p>
                <p className="text-sm text-orange-600">Xử lý đơn hàng để nhận tiền nhanh hơn</p>
              </div>
              <Link href="/seller/orders">
                <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  Xem ngay
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Đơn hàng gần đây</h2>
            <Link href="/seller/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Xem tất cả <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {dashboard.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Chưa có đơn hàng nào
              </div>
            ) : (
              dashboard.recentOrders.map((order: any) => (
                <div key={order.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {order.buyer?.name || order.buyer?.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {order.total?.toLocaleString('vi-VN')}đ
                    </p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status === 'COMPLETED' ? 'Hoàn thành' :
                       order.status === 'PENDING' ? 'Chờ xử lý' :
                       order.status === 'PROCESSING' ? 'Đang xử lý' :
                       order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Sản phẩm bán chạy</h2>
            <Link href="/seller/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Xem tất cả <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {dashboard.topProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Chưa có sản phẩm nào
              </div>
            ) : (
              dashboard.topProducts.map((product: any, index: number) => (
                <div key={product.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                    {index + 1}
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images && JSON.parse(product.images)[0] ? (
                      <img 
                        src={JSON.parse(product.images)[0]} 
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-sm text-gray-500">
                      {product.price?.toLocaleString('vi-VN')}đ • Còn {product.stock}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{product.sales} đã bán</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

