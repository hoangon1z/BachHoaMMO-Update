'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Package, ShoppingBag, TrendingUp, TrendingDown, Wallet,
  AlertCircle, ArrowUpRight, Clock, Phone, Lock, ArrowRight,
  BadgeCheck, X, Sparkles, DollarSign, BarChart3, CalendarDays,
  Star, Eye
} from 'lucide-react';
import { VerifyBadge } from '@/components/VerifyBadge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardData {
  store: {
    id: string; shopName: string; rating: number; totalSales: number;
    isVerified: boolean; balance: number; walletBalance: number;
  };
  stats: {
    products: { total: number; active: number };
    orders: { total: number; pending: number; completedThisMonth: number; growth: number };
    revenue: { today: number; thisMonth: number; lastMonth: number; total: number; growth: number };
    today: { revenue: number; completedOrders: number; newOrders: number };
    complaints: { open: number };
    withdrawals: { pending: number };
  };
  revenueChart: { date: string; revenue: number; orders: number }[];
  recentOrders: any[];
  topProducts: any[];
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
};
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
};
const fmtTime = (d: string) => {
  const dt = new Date(d);
  return `${dt.toLocaleDateString('vi-VN')} ${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingContact, setMissingContact] = useState(false);
  const [missingPin, setMissingPin] = useState(false);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchStoreInfo();
    const dismissed = localStorage.getItem('seller_verified_banner_dismissed');
    if (!dismissed) setShowVerifiedBanner(true);
  }, []);

  const dismissVerifiedBanner = () => {
    setShowVerifiedBanner(false);
    localStorage.setItem('seller_verified_banner_dismissed', 'true');
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        if (response.status === 404) { setError('NOT_FOUND'); } else { throw new Error(); }
        return;
      }
      setDashboard(await response.json());
    } catch { setError('ERROR'); }
    finally { setIsLoading(false); }
  };

  const fetchStoreInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/store`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Chỉ cảnh báo nếu thiếu CẢ HAI: SĐT và Telegram username liên lạc
        setMissingContact(!data.contactPhone && !data.contactTelegram);
        setMissingPin(!data.hasWithdrawalPin);
      }
    } catch { /* */ }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl" />
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
          <p className="text-gray-600 mb-6">Bạn cần tạo cửa hàng trước khi có thể bắt đầu bán hàng.</p>
          <Link href="/seller/settings"><Button className="h-12 px-6 bg-blue-600 hover:bg-blue-700">Tạo cửa hàng ngay</Button></Link>
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
          <p className="text-gray-600 mb-6">Không tải được. Vui lòng thử lại.</p>
          <Button onClick={fetchDashboard} className="h-12 px-6">Thử lại</Button>
        </div>
      </div>
    );
  }

  const d = dashboard;
  const chart = d.revenueChart || [];
  const maxChartRev = Math.max(...chart.map(c => c.revenue), 1);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Xin chào, <span className="font-medium text-gray-700">{d.store.shopName}</span>
            {d.store.isVerified && <VerifyBadge size={16} isVerified className="inline-block ml-1 -mt-0.5" />}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/products/new">
            <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white h-9 text-sm">
              <Package className="w-4 h-4 mr-1.5" /> Thêm sản phẩm
            </Button>
          </Link>
        </div>
      </div>

      {/* Verified banner */}
      {showVerifiedBanner && !d.store.isVerified && (
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <button onClick={dismissVerifiedBanner} className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10" aria-label="Đóng">
            <X className="w-4 h-4 text-white/70" />
          </button>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/15">
              <VerifyBadge size={32} isVerified={true} />
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-bold text-sm sm:text-base mb-0.5">Nhận Tích Xanh cho Gian Hàng!</h3>
              <p className="text-xs text-blue-100">Tăng uy tín và thu hút nhiều khách hàng hơn.</p>
            </div>
          </div>
          <div className="relative mt-3 flex items-center gap-3">
            <Link href="/seller/insurance">
              <Button className="bg-white text-blue-700 hover:bg-blue-50 h-8 text-xs font-semibold px-3 shadow-sm">
                <BadgeCheck className="w-3.5 h-3.5 mr-1" /> Tìm hiểu
              </Button>
            </Link>
            <button onClick={dismissVerifiedBanner} className="text-xs text-blue-200 hover:text-white">Để sau</button>
          </div>
        </div>
      )}

      {/* Missing info warnings */}
      {(missingContact || missingPin) && (
        <div className="space-y-2">
          {missingContact && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-800 text-sm">Thiếu thông tin liên lạc</p>
                <p className="text-xs text-amber-600">Thêm SĐT hoặc Telegram để admin liên hệ.</p>
              </div>
              <Link href="/seller/settings"><Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs h-8">Cập nhật</Button></Link>
            </div>
          )}
          {missingPin && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-blue-800 text-sm">Chưa tạo mã PIN rút tiền</p>
                <p className="text-xs text-blue-600">Cần PIN 6 số để bảo mật khi rút tiền.</p>
              </div>
              <Link href="/seller/settings"><Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 text-xs h-8">Tạo PIN</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* ─── Today Summary Bar ─── */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Hôm nay — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-gray-400">Doanh thu</p>
            <p className="text-lg font-bold tabular-nums">{fmt(d.stats.today.revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Đơn hoàn thành</p>
            <p className="text-lg font-bold tabular-nums">{d.stats.today.completedOrders}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Đơn mới</p>
            <p className="text-lg font-bold tabular-nums">{d.stats.today.newOrders}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Số dư ví</p>
            <p className="text-lg font-bold tabular-nums">{fmt(d.store.walletBalance || d.store.balance)}</p>
          </div>
        </div>
      </div>

      {/* ─── Key Stats 4-grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue this month */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            {d.stats.revenue.growth !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${d.stats.revenue.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {d.stats.revenue.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(d.stats.revenue.growth)}%
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2.5 tabular-nums">{fmtShort(d.stats.revenue.thisMonth)}đ</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Doanh thu tháng này</p>
        </div>

        {/* Orders this month */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-green-600" />
            </div>
            {d.stats.orders.growth !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${d.stats.orders.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {d.stats.orders.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(d.stats.orders.growth)}%
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2.5 tabular-nums">{d.stats.orders.completedThisMonth}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Đơn hoàn thành tháng</p>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2.5 tabular-nums">{d.stats.products.active}<span className="text-sm font-normal text-gray-400">/{d.stats.products.total}</span></p>
          <p className="text-[11px] text-gray-400 mt-0.5">Sản phẩm đang bán</p>
        </div>

        {/* Pending orders */}
        <div className={`bg-white rounded-xl border p-4 ${d.stats.orders.pending > 0 ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d.stats.orders.pending > 0 ? 'bg-orange-100' : 'bg-gray-50'}`}>
              <Clock className={`w-4 h-4 ${d.stats.orders.pending > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            {d.stats.orders.pending > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">Cần xử lý</span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2.5 tabular-nums">{d.stats.orders.pending}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Đơn chờ xử lý</p>
        </div>
      </div>

      {/* ─── Revenue Chart (7 days) ─── */}
      {chart.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-sm text-gray-900">Doanh thu 7 ngày gần nhất</h2>
            </div>
            <p className="text-xs text-gray-400">
              Tổng: <span className="font-semibold text-gray-700">{fmt(chart.reduce((s, c) => s + c.revenue, 0))}</span>
            </p>
          </div>
          <div className="flex items-end gap-1 h-32">
            {chart.map((day, idx) => {
              const pct = maxChartRev > 0 ? (day.revenue / maxChartRev) * 100 : 0;
              const isToday = idx === chart.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap z-10 pointer-events-none">
                    <p className="font-semibold">{fmt(day.revenue)}</p>
                    <p className="text-gray-300">{day.orders} đơn</p>
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-blue-300'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className={`text-[10px] ${isToday ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>{fmtDate(day.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Summary Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tổng doanh thu</p>
          <p className="text-base font-bold text-gray-900 mt-1 tabular-nums">{fmt(d.stats.revenue.total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tổng đơn hoàn thành</p>
          <p className="text-base font-bold text-gray-900 mt-1 tabular-nums">{d.store.totalSales}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Đánh giá</p>
          <p className="text-base font-bold text-gray-900 mt-1 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            {d.store.rating?.toFixed(1) || '0.0'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tháng trước</p>
          <p className="text-base font-bold text-gray-900 mt-1 tabular-nums">{fmt(d.stats.revenue.lastMonth)}</p>
        </div>
      </div>

      {/* Alerts */}
      {(d.stats.complaints.open > 0 || d.stats.orders.pending > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {d.stats.complaints.open > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1"><p className="font-medium text-red-800 text-sm">{d.stats.complaints.open} khiếu nại đang chờ</p></div>
              <Link href="/seller/complaints"><Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100 text-xs h-8">Xem</Button></Link>
            </div>
          )}
          {d.stats.orders.pending > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1"><p className="font-medium text-orange-800 text-sm">{d.stats.orders.pending} đơn chờ xử lý</p></div>
              <Link href="/seller/orders"><Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100 text-xs h-8">Xem</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* ─── Recent Orders + Top Products ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Đơn hàng gần đây</h2>
            <Link href="/seller/orders" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
              Xem tất cả <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Chưa có đơn hàng</div>
            ) : (
              d.recentOrders.map((order: any) => (
                <div key={order.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.buyer?.name || order.buyer?.email} — {fmtTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(order.total)}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
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
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Sản phẩm bán chạy</h2>
            <Link href="/seller/products" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
              Xem tất cả <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {d.topProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Chưa có sản phẩm</div>
            ) : (
              d.topProducts.map((product: any, index: number) => (
                <div key={product.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center text-xs font-semibold text-gray-500">{index + 1}</div>
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images && JSON.parse(product.images)[0] ? (
                      <img src={JSON.parse(product.images)[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-xs text-gray-400">{fmt(product.price)} — Còn {product.stock}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-green-600">{product.sales} bán</p>
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
