'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Lock,
  Menu,
  X,
  LogOut,
  Home,
  Image,
  FolderOpen,
  Package,
  Store,
  Shield,
  Bell,
  Search,
  ChevronDown,
  Settings,
  MessageCircle,
  Gavel,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/messages', label: 'Tin nhắn', icon: MessageCircle },
  { href: '/admin/notifications', label: 'Gửi thông báo', icon: Bell },
  { href: '/admin/auction', label: 'Đấu giá TOP', icon: Gavel },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/categories', label: 'Danh mục', icon: FolderOpen },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/sellers', label: 'Người bán', icon: Store },
  { href: '/admin/seller-applications', label: 'Duyệt Seller', icon: Shield, badge: 'sellers' },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { href: '/admin/recharges', label: 'Duyệt nạp tiền', icon: DollarSign, badge: true },
  { href: '/admin/withdrawals', label: 'Duyệt rút tiền', icon: Wallet, badge: 'withdrawals' },
  { href: '/admin/escrows', label: 'Escrow', icon: Lock },
  { href: '/admin/transactions', label: 'Giao dịch', icon: TrendingUp },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, checkAuth, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [pendingSellersCount, setPendingSellersCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsCheckingAuth(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isCheckingAuth && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isCheckingAuth]);

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch pending recharges
        const rechargesRes = await fetch('/api/admin/recharges/pending', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (rechargesRes.ok) {
          const data = await rechargesRes.json();
          setPendingCount(data.length || 0);
        }
        
        // Fetch pending withdrawals
        const withdrawalsRes = await fetch('/api/admin/withdrawals/pending-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (withdrawalsRes.ok) {
          const data = await withdrawalsRes.json();
          setPendingWithdrawalsCount(data.count || 0);
        }
        
        // Fetch pending seller applications
        const sellersRes = await fetch('/api/admin/seller-applications/pending-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (sellersRes.ok) {
          const data = await sellersRes.json();
          setPendingSellersCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching pending counts:', error);
      }
    };
    if (user?.role === 'ADMIN') {
      fetchPendingCounts();
      const interval = setInterval(fetchPendingCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-500/30 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <p className="text-gray-400 mt-4">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-50 ${isSidebarCollapsed ? 'w-16' : 'w-64'} ${!isSidebarOpen ? '-translate-x-full lg:translate-x-0' : ''}`}>
        {/* Logo */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
          {!isSidebarCollapsed ? (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-900" />
              </div>
              <span className="font-bold">Admin Panel</span>
            </Link>
          ) : (
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-gray-900" />
            </div>
          )}
        </div>

        {/* User Info */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-gray-900">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            // Get badge count based on badge type
            const getBadgeCount = () => {
              if (link.badge === true) return pendingCount;
              if (link.badge === 'withdrawals') return pendingWithdrawalsCount;
              if (link.badge === 'sellers') return pendingSellersCount;
              return 0;
            };
            const badgeCount = getBadgeCount();

            return (
              <Link key={link.href} href={link.href}>
                <div className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive ? 'bg-amber-500 text-gray-900' : 'text-gray-400 hover:text-white hover:bg-gray-800'} ${isSidebarCollapsed && 'justify-center'}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="text-sm font-medium">{link.label}</span>
                      {link.badge && badgeCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                  {isSidebarCollapsed && link.badge && badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {badgeCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-800 bg-gray-900 space-y-1">
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all ${isSidebarCollapsed && 'justify-center'}`}>
            <Menu className="w-5 h-5" />
            {!isSidebarCollapsed && <span className="text-sm">Thu gọn</span>}
          </button>
          <Link href="/">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all ${isSidebarCollapsed && 'justify-center'}`}>
              <Home className="w-5 h-5" />
              {!isSidebarCollapsed && <span className="text-sm">Về trang chủ</span>}
            </div>
          </Link>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${isSidebarCollapsed && 'justify-center'}`}>
            <LogOut className="w-5 h-5" />
            {!isSidebarCollapsed && <span className="text-sm">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3" />
              <input type="text" placeholder="Tìm kiếm..." className="w-60 h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
                {pendingCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{pendingCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 font-medium">Thông báo</div>
                  <div className="max-h-64 overflow-y-auto">
                    {pendingCount > 0 ? (
                      <Link href="/admin/recharges" onClick={() => setShowNotifications(false)}>
                        <div className="p-3 hover:bg-gray-50 border-b border-gray-50">
                          <p className="text-sm font-medium">Yêu cầu nạp tiền mới</p>
                          <p className="text-xs text-gray-500">Có {pendingCount} yêu cầu chờ duyệt</p>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">Không có thông báo</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <Link href="/" onClick={() => setShowUserMenu(false)}>
                      <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-md text-sm">
                        <Home className="w-4 h-4 text-gray-500" />
                        Về trang chủ
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-md text-sm text-red-600">
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      {/* Click outside to close */}
      {(showUserMenu || showNotifications) && <div className="fixed inset-0 z-20" onClick={() => { setShowUserMenu(false); setShowNotifications(false); }} />}
    </div>
  );
}
