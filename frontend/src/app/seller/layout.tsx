'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquareWarning,
  Wallet,
  Settings,
  Store,
  ChevronLeft,
  Menu,
  X,
  Bell,
  LogOut,
  Plug,
  MessageCircle,
  FileText,
  BadgeCheck,
  Zap,
  Pin,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/seller' },
  { icon: Package, label: 'Sản phẩm', href: '/seller/products' },
  { icon: Pin, label: 'Ghim sản phẩm', href: '/seller/pinned-products' },
  { icon: ShoppingBag, label: 'Đơn hàng', href: '/seller/orders' },
  { icon: Zap, label: 'Đơn dịch vụ', href: '/seller/service-orders' },
  { icon: MessageCircle, label: 'Tin nhắn', href: '/seller/messages' },
  { icon: FileText, label: 'Blogs', href: '/seller/blogs' },
  { icon: MessageSquareWarning, label: 'Khiếu nại', href: '/seller/complaints' },
  { icon: Wallet, label: 'Rút tiền', href: '/seller/withdrawals' },
  { icon: Tag, label: 'Mã giảm giá', href: '/seller/discount-codes' },
  { icon: Plug, label: 'Kết nối API', href: '/seller/api' },
  { icon: Bell, label: 'Thông báo', href: '/seller/notifications' },
  { icon: BadgeCheck, label: 'Bảo hiểm', href: '/seller/insurance' },
  { icon: Settings, label: 'Cài đặt cửa hàng', href: '/seller/settings' },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, checkAuth, logout, isInitialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && isInitialized) {
      if (!user) {
        router.push('/login?redirect=/seller');
      } else if (user.role !== 'SELLER' && !user.isSeller) {
        router.push('/');
      }
    }
  }, [user, isLoading, isInitialized]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'SELLER' && !user.isSeller)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        <Link href="/seller" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Seller Center</span>
        </Link>

        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
          <Bell className="w-6 h-6 text-gray-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link href="/seller" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Seller Center</h1>
              <p className="text-[10px] text-gray-500">Quản lý cửa hàng</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user.name || 'Seller'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600">Số dư khả dụng</p>
            <p className="text-lg font-bold text-green-600">
              {(user.balance || 0).toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/seller' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 flex-shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
            Về trang chủ
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}

