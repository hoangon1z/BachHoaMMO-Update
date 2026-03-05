'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  Users, ShoppingBag, DollarSign, Clock, TrendingUp, TrendingDown,
  Package, Store, ArrowUpRight, Activity, CreditCard, AlertCircle,
  BarChart3, CalendarDays, Wallet, Shield, Eye
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardData {
  stats: {
    totalUsers: number; totalOrders: number; pendingRecharges: number;
    holdingEscrows: number; totalRevenue: number; totalSellers: number;
    totalProducts: number; pendingWithdrawals: number;
  };
  today: { orders: number; revenue: number; newUsers: number; commission: number };
  month: { orders: number; revenue: number; commission: number; revenueGrowth: number; ordersGrowth: number };
  chart: { date: string; revenue: number; orders: number; commission: number }[];
  recentOrders: any[];
  recentTransactions: any[];
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

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* */ }
    finally { setIsLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-1">Không thể tải dữ liệu</h3>
        <Button onClick={fetchDashboard} size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600 text-gray-900">Thử lại</Button>
      </div>
    );
  }

  const s = data.stats;
  const t = data.today;
  const m = data.month;
  const chart = data.chart || [];
  const maxChartRev = Math.max(...chart.map(c => c.revenue), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400">Tổng quan hệ thống</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Activity className="w-3.5 h-3.5 text-green-500" />
          <span>{new Date().toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>

      {/* Alert */}
      {(s.pendingRecharges > 0 || s.pendingWithdrawals > 0) && (
        <div className="flex flex-wrap gap-2">
          {s.pendingRecharges > 0 && (
            <Link href="/admin/recharges" className="flex-1 min-w-[200px]">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">{s.pendingRecharges} nạp tiền chờ</p>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900 h-8 text-xs">Duyệt</Button>
              </div>
            </Link>
          )}
          {s.pendingWithdrawals > 0 && (
            <Link href="/admin/withdrawals" className="flex-1 min-w-[200px]">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-blue-100 transition-colors">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">{s.pendingWithdrawals} rút tiền chờ</p>
                </div>
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 h-8 text-xs">Xem</Button>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ─── Today Summary ─── */}
      <div className="bg-gray-900 text-white rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Hôm nay — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-gray-400">Doanh thu</p>
            <p className="text-lg font-bold tabular-nums">{fmt(t.revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Hoa hồng</p>
            <p className="text-lg font-bold tabular-nums text-amber-400">{fmt(t.commission)}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Đơn hàng</p>
            <p className="text-lg font-bold tabular-nums">{t.orders}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">User mới</p>
            <p className="text-lg font-bold tabular-nums">{t.newUsers}</p>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tổng user" value={s.totalUsers.toLocaleString()} icon={<Users className="w-4 h-4 text-sky-600" />} bgIcon="bg-sky-50" />
        <StatCard label="Tổng seller" value={s.totalSellers.toLocaleString()} icon={<Store className="w-4 h-4 text-emerald-600" />} bgIcon="bg-emerald-50" />
        <StatCard label="Tổng đơn hàng" value={s.totalOrders.toLocaleString()} icon={<ShoppingBag className="w-4 h-4 text-blue-600" />} bgIcon="bg-blue-50" />
        <StatCard label="Tổng sản phẩm" value={s.totalProducts.toLocaleString()} icon={<Package className="w-4 h-4 text-purple-600" />} bgIcon="bg-purple-50" />
      </div>

      {/* ─── Month Stats + Commission ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-blue-600" /></div>
            {m.revenueGrowth !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${m.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {m.revenueGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(m.revenueGrowth)}%
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2 tabular-nums">{fmtShort(m.revenue)}đ</p>
          <p className="text-[11px] text-gray-400">Doanh thu tháng này</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-amber-600" /></div>
          <p className="text-lg font-bold text-gray-900 mt-2 tabular-nums">{fmtShort(m.commission)}đ</p>
          <p className="text-[11px] text-gray-400">Hoa hồng tháng này</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center"><ShoppingBag className="w-4 h-4 text-green-600" /></div>
            {m.ordersGrowth !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${m.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {m.ordersGrowth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(m.ordersGrowth)}%
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900 mt-2 tabular-nums">{m.orders}</p>
          <p className="text-[11px] text-gray-400">Đơn HT tháng này</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-gray-600" /></div>
          <p className="text-lg font-bold text-gray-900 mt-2 tabular-nums">{fmtShort(s.totalRevenue)}đ</p>
          <p className="text-[11px] text-gray-400">Tổng hoa hồng all-time</p>
        </div>
      </div>

      {/* ─── 7-day Chart ─── */}
      {chart.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-sm text-gray-900">7 ngày gần nhất</h2>
            </div>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>Doanh thu: <span className="font-semibold text-gray-700">{fmt(chart.reduce((sum, c) => sum + c.revenue, 0))}</span></span>
              <span>Hoa hồng: <span className="font-semibold text-amber-600">{fmt(chart.reduce((sum, c) => sum + c.commission, 0))}</span></span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-36">
            {chart.map((day, idx) => {
              const pct = maxChartRev > 0 ? (day.revenue / maxChartRev) * 100 : 0;
              const isToday = idx === chart.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap z-10 pointer-events-none">
                    <p className="font-semibold">{fmt(day.revenue)}</p>
                    <p className="text-gray-300">{day.orders} đơn — HH: {fmt(day.commission)}</p>
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? 'bg-amber-500' : 'bg-gray-200 group-hover:bg-amber-300'}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                  <span className={`text-[10px] ${isToday ? 'font-semibold text-amber-600' : 'text-gray-400'}`}>{fmtDate(day.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Quick Actions ─── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/admin/recharges', icon: CreditCard, title: 'Duyệt nạp tiền', desc: `${s.pendingRecharges} chờ`, color: 'bg-amber-500', badge: s.pendingRecharges },
            { href: '/admin/withdrawals', icon: Wallet, title: 'Duyệt rút tiền', desc: `${s.pendingWithdrawals} chờ`, color: 'bg-blue-500', badge: s.pendingWithdrawals },
            { href: '/admin/escrows', icon: DollarSign, title: 'Escrow', desc: `${s.holdingEscrows} đang giữ`, color: 'bg-emerald-500' },
            { href: '/admin/insurance', icon: Shield, title: 'Bảo hiểm', desc: 'Quản lý quỹ BH', color: 'bg-gray-800' },
          ].map(a => (
            <Link key={a.href} href={a.href}>
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 ${a.color} rounded-lg flex items-center justify-center text-white`}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  {a.badge !== undefined && a.badge > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">{a.badge}</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm text-gray-900">{a.title}</h3>
                <p className="text-xs text-gray-400">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ─── Recent Orders + Transactions ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Xem tất cả <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {(data.recentOrders || []).map((o: any) => (
              <div key={o.id} className="px-5 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{o.orderNumber}</p>
                  <p className="text-[11px] text-gray-400">{o.buyer?.name || o.buyer?.email} → {o.seller?.name || 'N/A'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900 tabular-nums">{fmt(o.total || o.subtotal || 0)}</p>
                  <p className="text-[10px] text-gray-400">{fmtTime(o.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Giao dịch gần đây</h2>
            <Link href="/admin/transactions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">Xem tất cả <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {(data.recentTransactions || []).map((tx: any) => (
              <div key={tx.id} className="px-5 py-2.5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${tx.type === 'DEPOSIT' ? 'bg-green-50' :
                    tx.type === 'WITHDRAWAL' ? 'bg-red-50' :
                      tx.type === 'COMMISSION' ? 'bg-amber-50' : 'bg-gray-50'
                  }`}>
                  <DollarSign className={`w-3.5 h-3.5 ${tx.type === 'DEPOSIT' ? 'text-green-600' :
                      tx.type === 'WITHDRAWAL' ? 'text-red-500' :
                        tx.type === 'COMMISSION' ? 'text-amber-600' : 'text-gray-500'
                    }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.user?.name || tx.user?.email}</p>
                  <p className="text-[11px] text-gray-400">{tx.description || tx.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${tx.type === 'DEPOSIT' ? 'text-green-600' : tx.type === 'WITHDRAWAL' ? 'text-red-500' : 'text-gray-900'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : tx.type === 'WITHDRAWAL' ? '-' : ''}{fmt(tx.amount)}
                  </p>
                  <p className="text-[10px] text-gray-400">{fmtTime(tx.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── System Status ─── */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Trạng thái hệ thống</h3>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-400 text-xs">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Online
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400">Chờ nạp tiền</p>
            <p className="text-lg font-bold tabular-nums">{s.pendingRecharges}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400">Escrow giữ</p>
            <p className="text-lg font-bold tabular-nums">{s.holdingEscrows}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400">Chờ rút tiền</p>
            <p className="text-lg font-bold tabular-nums">{s.pendingWithdrawals}</p>
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400">Đơn HT tháng</p>
            <p className="text-lg font-bold tabular-nums">{m.orders}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable stat card ─── */
function StatCard({ label, value, icon, bgIcon }: { label: string; value: string; icon: React.ReactNode; bgIcon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 ${bgIcon} rounded-lg flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
