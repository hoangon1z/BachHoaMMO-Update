'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Users, ShoppingBag, DollarSign, Clock, TrendingUp, Package, Store, ArrowUpRight, Activity, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { StatsCard, PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/admin-api';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingRecharges: number;
  holdingEscrows: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getDashboard();
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { href: '/admin/users', icon: Users, title: 'Quản lý Users', description: 'Xem và quản lý người dùng', color: 'bg-sky-500' },
    { href: '/admin/recharges', icon: CreditCard, title: 'Duyệt nạp tiền', description: 'Xử lý yêu cầu nạp tiền', color: 'bg-amber-500', badge: stats?.pendingRecharges || 0 },
    { href: '/admin/escrows', icon: DollarSign, title: 'Quản lý Escrow', description: 'Release escrow cho seller', color: 'bg-emerald-500' },
    { href: '/admin/transactions', icon: TrendingUp, title: 'Giao dịch', description: 'Xem tất cả giao dịch', color: 'bg-gray-700' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tổng quan hệ thống marketplace"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Đang tải...</p>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Alert */}
          {stats.pendingRecharges > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">Có {stats.pendingRecharges} yêu cầu nạp tiền chờ duyệt</p>
                  <p className="text-sm text-amber-700">Vui lòng xử lý các yêu cầu này</p>
                </div>
              </div>
              <Link href="/admin/recharges">
                <Button className="bg-amber-500 hover:bg-amber-600 text-gray-900">Duyệt ngay</Button>
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard title="Tổng người dùng" value={stats.totalUsers.toLocaleString('vi-VN')} icon={<Users className="w-5 h-5" />} color="blue" />
            <StatsCard title="Tổng đơn hàng" value={stats.totalOrders.toLocaleString('vi-VN')} icon={<ShoppingBag className="w-5 h-5" />} color="green" />
            <StatsCard title="Chờ duyệt nạp" value={stats.pendingRecharges} icon={<Clock className="w-5 h-5" />} color="amber" onClick={() => window.location.href = '/admin/recharges'} />
            <StatsCard title="Escrow đang giữ" value={stats.holdingEscrows} icon={<DollarSign className="w-5 h-5" />} color="gray" />
            <StatsCard title="Tổng hoa hồng" value={`${(stats.totalRevenue / 1000000).toFixed(1)}M`} subtitle={`${stats.totalRevenue.toLocaleString('vi-VN')}đ`} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {action.badge !== undefined && action.badge > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">{action.badge}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Management Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900">Quản lý sản phẩm</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Xem và quản lý tất cả sản phẩm</p>
              <Link href="/admin/products">
                <Button variant="outline" className="w-full">Xem sản phẩm <ArrowUpRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Store className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-gray-900">Quản lý người bán</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Xác minh và quản lý sellers</p>
              <Link href="/admin/sellers">
                <Button variant="outline" className="w-full">Xem người bán <ArrowUpRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <ShoppingBag className="w-5 h-5 text-sky-500" />
                <h3 className="font-semibold text-gray-900">Quản lý đơn hàng</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Theo dõi và xử lý đơn hàng</p>
              <Link href="/admin/orders">
                <Button variant="outline" className="w-full">Xem đơn hàng <ArrowUpRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Tổng quan hệ thống</h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/20 rounded text-emerald-400 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Hoạt động bình thường
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Doanh thu hôm nay</p>
                <p className="text-xl font-bold">0đ</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Đơn hàng hôm nay</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Người dùng mới</p>
                <p className="text-xl font-bold">0</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Tỉ lệ hoàn thành</p>
                <p className="text-xl font-bold">100%</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Không thể tải dữ liệu</h3>
          <p className="text-gray-500 mb-4">Đã xảy ra lỗi khi tải dashboard</p>
          <Button onClick={fetchDashboard} className="bg-amber-500 hover:bg-amber-600 text-gray-900">Thử lại</Button>
        </div>
      )}
    </div>
  );
}
