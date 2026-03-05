'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShoppingBag, Wallet, Settings, ChevronDown, Store, Shield, MessageCircle, UserPlus, Wrench, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfileMenuProps {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    balance?: number;
    role?: string;
    isSeller?: boolean;
  } | null;
  onLogout: () => void;
}

export function UserProfileMenu({ user, onLogout }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Base menu items for all users
  const baseMenuItems = [
    {
      icon: User,
      label: 'Thông tin cá nhân',
      href: '/profile',
      description: 'Quản lý thông tin tài khoản',
    },
    {
      icon: MessageCircle,
      label: 'Tin nhắn',
      href: '/messages',
      description: 'Chat với người bán và admin',
    },
    {
      icon: ShoppingBag,
      label: 'Đơn hàng của tôi',
      href: '/orders',
      description: 'Xem lịch sử mua hàng',
    },
    {
      icon: Wallet,
      label: 'Ví của tôi',
      href: '/wallet',
      description: 'Nạp tiền & quản lý số dư',
      balance: user.balance || 0,
    },
    {
      icon: Wrench,
      label: 'Công cụ tiện ích',
      href: '/tools',
      description: '2FA, Check FB, Random...',
    },
    {
      icon: Settings,
      label: 'Cài đặt',
      href: '/settings',
      description: 'Tùy chỉnh tài khoản',
    },
  ];

  // Seller-specific menu item
  const sellerMenuItem = {
    icon: Store,
    label: 'Quản lý cửa hàng',
    href: '/seller',
    description: 'Dashboard, sản phẩm, đơn hàng',
  };

  // Become seller menu item
  const becomeSellerMenuItem = {
    icon: UserPlus,
    label: 'Đăng ký bán hàng',
    href: '/become-seller',
    description: 'Trở thành người bán trên BachHoaMMO',
    highlight: true,
  };

  // Admin-specific menu item
  const adminMenuItem = {
    icon: Shield,
    label: 'Quản trị hệ thống',
    href: '/admin',
    description: 'Quản lý toàn bộ hệ thống',
    isAdmin: true,
  };

  // Build menu items based on user role
  let menuItems = [...baseMenuItems];
  
  // Add seller menu for sellers
  if (user.role === 'SELLER' || user.isSeller) {
    menuItems = [baseMenuItems[0], sellerMenuItem, ...baseMenuItems.slice(1)];
  } else if (user.role === 'BUYER') {
    // Add become seller option for buyers
    menuItems = [...baseMenuItems, becomeSellerMenuItem];
  }
  
  // Add admin menu for admins (at the top)
  if (user.role === 'ADMIN') {
    menuItems = [adminMenuItem, ...menuItems];
  }

  const handleMenuClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button - Optimized for mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-secondary transition-colors"
      >
        {/* Avatar - Smaller on mobile */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name || user.email}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{(user.name || user.email).charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* User Info - Hidden on mobile */}
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground">
            {user.name || user.email.split('@')[0]}
          </span>
          {user.balance !== undefined && (
            <span className="text-xs text-muted-foreground">
              {user.balance.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>

        {/* Dropdown Icon - Smaller on mobile */}
        <ChevronDown 
          className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Responsive width and positioning */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden -mr-1 sm:mr-0">
          {/* User Info Header */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name || user.email}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{(user.name || user.email).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
                {user.balance !== undefined && (
                  <p className="text-sm font-bold text-green-600 mt-0.5">
                    {user.balance.toLocaleString('vi-VN')}đ
                  </p>
                )}
              </div>
            </div>
            {/* Nút Nạp tiền nổi bật trong dropdown */}
            <Link
              href="/wallet/recharge"
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full h-9 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nạp tiền ngay
            </Link>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuClick(item.href)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-medium text-foreground text-sm">
                    {item.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                  {item.balance !== undefined && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      {item.balance.toLocaleString('vi-VN')}đ
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Logout Button */}
          <div className="border-t border-border p-2">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-destructive/10 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-destructive text-sm">
                  Đăng xuất
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thoát khỏi tài khoản
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
