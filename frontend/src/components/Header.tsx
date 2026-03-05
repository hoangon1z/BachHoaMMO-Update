'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { Button } from './ui/button';
import { UserProfileMenu } from './UserProfileMenu';
import { useCartStore } from '@/store/cartStore';
import {
  ShoppingCart, Menu, X, Phone, Mail, ChevronDown, ChevronRight, User, LogIn, Shield, Gavel, Loader2,
  Folder, MonitorPlay, Cpu, Music, MessageCircle, Video, GraduationCap, Globe, Package, Layers, Wrench, FileText,
  Bell, ShoppingBag, Wallet, Settings, Store, UserPlus, LogOut, MessageSquare, BadgeCheck, Sparkles, Plus
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { AnnouncementBar } from './AnnouncementBar';
import { ThemeToggle, ThemeToggleSimple } from './ThemeToggle';
import { apiFetch } from '@/lib/config';
import { useAuthStore } from '@/store/authStore';
import { useAuthModal } from '@/store/authModalStore';

/* ───────────────────────── Types ───────────────────────── */

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onSearch?: (query: string) => void;
}

/* ───────────────── Design tokens (unified) ───────────────── */

// All icons use these sizes for consistency
const ICON = 'w-5 h-5';           // primary icons
const ICON_SM = 'w-4 h-4';        // secondary / badges
const BTN_H = 'h-10';             // standard button height
const BTN_ICON = `${BTN_H} w-10`; // icon-only button
const MENU_ITEM = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors';
const SECTION_PAD = 'px-4 py-3';  // uniform mobile-menu section padding

/* ───────────────────── Category icons ───────────────────── */

const getCategoryIcon = (slug: string, size = ICON_SM) => {
  const map: Record<string, React.ReactNode> = {
    'tai-khoan': <Folder className={size} />,
    'phan-mem': <Cpu className={size} />,
    'dich-vu': <Layers className={size} />,
    'khac': <Package className={size} />,
    'tai-khoan-netflix': <MonitorPlay className={size} />,
    'tai-khoan-spotiffy': <Music className={size} />,
    'tai-khoan-facebook': <MessageCircle className={size} />,
    'tai-khoan-youtube': <Video className={size} />,
    'tai-khoan-telegram': <MessageCircle className={size} />,
    'tai-khoan-ai': <Cpu className={size} />,
    'tai-khoan-canva': <Layers className={size} />,
    'tai-khoan-cap-cut': <Video className={size} />,
    'tai-khoan-hoc-tap': <GraduationCap className={size} />,
    'tai-khoan-vpn-proxy': <Globe className={size} />,
    'tai-khoan-adobe': <Layers className={size} />,
    'key-van-phong-do-hoa': <Cpu className={size} />,
  };
  return map[slug] || <Folder className={size} />;
};

/* ───────────────────── Cart Badge ───────────────────── */

function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   HEADER COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function Header({ user, onLogout, onSearch }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();
  const { openLogin, openRegister } = useAuthModal();
  const { getTotalItems } = useCartStore();
  const cartCount = getTotalItems();

  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);
  const [siteSettings, setSiteSettings] = useState<{
    contact: { email: string; phone: string; address: string };
    social: { facebook: string; telegram: string; zalo: string; zaloDisplay?: string };
  } | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(108);

  /* ─── Effects ─── */

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(t);
  }, []);

  // Check if verified banner should show for sellers
  useEffect(() => {
    if (user?.isSeller || user?.role === 'SELLER') {
      const dismissed = localStorage.getItem('header_verified_banner_dismissed');
      if (!dismissed) {
        setShowVerifiedBanner(true);
      }
    }
  }, [user]);

  // Measure header height for mobile menu offset
  useEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isLoading, user]);

  // Fetch categories
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/categories?parent=true');
        if (res.ok) setCategories(await res.json());
      } catch { /* silent */ } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  // Fetch site settings (contact info from admin)
  useEffect(() => {
    fetch('/api/settings/site')
      .then(res => res.json())
      .then(data => { if (data.success) setSiteSettings(data.settings); })
      .catch(() => { });
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (!user || !token) return;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setUnreadNotifCount(data.count);
      } catch { /* silent */ }
    };
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => clearInterval(id);
  }, [user, token]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  /* ─── Handlers ─── */

  const handleSearch = (query: string) => {
    if (query.trim()) router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    setMobileMenuOpen(false);
    onSearch?.(query);
  };

  const handleCategoryClick = (categoryId: string) => {
    setShowCategories(false);
    setMobileMenuOpen(false);
    router.push(`/explore?category=${categoryId}`);
  };

  const navigateMobile = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white shadow-sm">

      {/* ─────────── Security Marquee Banner ─────────── */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white overflow-hidden">
        <div className="py-1.5 whitespace-nowrap animate-marquee">
          <span className="inline-block text-xs sm:text-sm font-medium">
            ⚠️ Website duy nhất: <strong className="underline">BachHoaMMO.Store</strong> &nbsp;|&nbsp; Telegram Support: <strong>@bachhoasupport</strong> &nbsp;|&nbsp; Zalo liên hệ: <strong>0879.06.2222</strong> &nbsp;|&nbsp; 🚫 Mọi tên miền khác đều là giả mạo! &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            ⚠️ Website duy nhất: <strong className="underline">BachHoaMMO.Store</strong> &nbsp;|&nbsp; Telegram Support: <strong>@bachhoasupport</strong> &nbsp;|&nbsp; Zalo liên hệ: <strong>0879.06.2222</strong> &nbsp;|&nbsp; 🚫 Mọi tên miền khác đều là giả mạo! &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      {/* ─────────── Global Announcement Bar ─────────── */}
      <AnnouncementBar />

      {/* ─────────── Auction Banner (sellers only) ─────────── */}
      {user?.isSeller && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="page-wrapper py-1.5">
            <Link href="/auction" className="flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity">
              <Gavel className={ICON_SM} />
              <span>Đấu giá TOP Shop đang diễn ra!</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Tham gia ngay</span>
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════ Main Header Row ═══════════════ */}
      <div className="border-b border-gray-100">
        <div className="page-wrapper">

          {/* ── Top row: Logo + Search(desktop) + Actions ── */}
          <div className="flex items-center justify-between h-14 md:h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
              <img
                src="/images/logotetapp.png"
                alt="BachHoaMMO Logo"
                width={44}
                height={44}
                className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg shadow-md group-hover:shadow-lg transition-shadow object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                  BachHoa<span className="text-blue-600">MMO</span>
                </h1>
                <p className="text-[10px] md:text-xs text-gray-500 -mt-0.5">Chợ MMO uy tín #1</p>
              </div>
            </Link>

            {/* Search — Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-6">
              <SearchBar onSearch={handleSearch} placeholder="Tìm kiếm sản phẩm, dịch vụ..." fullRounded />
            </div>

            {/* ── Right Actions — Desktop ── */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />

              <Link href="/blogs" className="hidden lg:block">
                <Button variant="ghost" size="sm" className={`${BTN_H} px-3 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors`}>
                  <FileText className={`${ICON_SM} mr-1.5`} />
                  Blogs
                </Button>
              </Link>

              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className={`${BTN_ICON} bg-gray-100 animate-pulse rounded-full`} />
                  <div className="w-20 h-10 bg-gray-100 animate-pulse rounded-xl" />
                </div>
              ) : user ? (
                <>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin">
                      <Button size="sm" className={`${BTN_H} bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-sm`}>
                        <Shield className={`${ICON_SM} mr-1.5`} />
                        Admin
                      </Button>
                    </Link>
                  )}

                  {/* Nút Nạp tiền nổi bật */}
                  <Link href="/wallet/recharge">
                    <Button size="sm" className={`${BTN_H} px-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md`}>
                      <Plus className={`${ICON_SM} mr-1.5`} />
                      Nạp tiền
                    </Button>
                  </Link>

                  <NotificationDropdown />

                  <Link href="/cart" aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}>
                    <Button variant="ghost" size="sm" className={`relative ${BTN_ICON} lg:w-auto lg:px-3 rounded-xl hover:bg-gray-100`}>
                      <ShoppingCart className={`${ICON} text-gray-700`} />
                      <span className="hidden lg:inline ml-1.5 text-gray-700 text-sm">Giỏ hàng</span>
                      <CartBadge count={cartCount} />
                    </Button>
                  </Link>

                  <UserProfileMenu user={user} onLogout={onLogout} />
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => openLogin()} className={`${BTN_H} px-4 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors`}>
                    <LogIn className={`${ICON_SM} mr-1.5`} />
                    Đăng nhập
                  </Button>

                  <Button size="sm" onClick={() => openRegister()} className={`${BTN_H} px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md`}>
                    <User className={`${ICON_SM} mr-1.5`} />
                    Đăng ký
                  </Button>

                  <Link href="/cart" aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}>
                    <Button variant="ghost" size="sm" className={`relative ${BTN_ICON} rounded-xl hover:bg-gray-100`}>
                      <ShoppingCart className={`${ICON} text-gray-700`} />
                      <CartBadge count={cartCount} />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* ── Right Actions — Mobile ── */}
            <div className="flex md:hidden items-center gap-1">
              {isLoading ? (
                <div className="w-9 h-9 bg-gray-100 animate-pulse rounded-full" />
              ) : user ? (
                <Link href="/cart" aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}>
                  <button className={`relative ${BTN_ICON} flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors`}>
                    <ShoppingCart className={`${ICON} text-gray-700`} />
                    <CartBadge count={cartCount} />
                  </button>
                </Link>
              ) : (
                <button onClick={() => openLogin()} className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm">
                  <LogIn className={ICON_SM} />
                  <span>Đăng nhập</span>
                </button>
              )}

              {/* Hamburger */}
              <button
                aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={mobileMenuOpen}
                className={`${BTN_ICON} flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className={`${ICON} text-gray-700`} />
                ) : (
                  <div className="relative">
                    <Menu className={`${ICON} text-gray-700`} />
                    {user && unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* ── Mobile Search (always visible below top row) ── */}
          <div className="md:hidden pb-3">
            <SearchBar onSearch={handleSearch} placeholder="Tìm kiếm sản phẩm..." fullRounded />
          </div>
        </div>
      </div>

      {/* ═══════════════ Mobile Menu ═══════════════ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50" style={{ top: `${headerHeight}px` }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />

          {/* Panel */}
          <div className="relative bg-white h-full overflow-y-auto pb-20" style={{ animation: 'slideIn 0.2s ease-out' }}>

            {/* ── User info (logged in) ── */}
            {user && (
              <div className={`${SECTION_PAD} py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(user.name || user.email).charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    {user.balance !== undefined && (
                      <p className="text-sm font-bold text-blue-600 mt-0.5">{user.balance.toLocaleString('vi-VN')}đ</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Guest prompt ── */}
            {!user && !isLoading && (
              <div className={`${SECTION_PAD} py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100`}>
                <p className="text-sm text-gray-600 mb-3">Đăng nhập để sử dụng đầy đủ tính năng</p>
                <div className="flex gap-2">
                  <button onClick={() => { setMobileMenuOpen(false); openLogin(); }} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <LogIn className={ICON_SM} /> Đăng nhập
                  </button>
                  <button onClick={() => { setMobileMenuOpen(false); openRegister(); }} className="flex-1 h-10 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <UserPlus className={ICON_SM} /> Đăng ký
                  </button>
                </div>
              </div>
            )}

            {/* ── Quick Actions (logged in) ── */}
            {user && (
              <div className={`${SECTION_PAD} border-b border-gray-100`}>
                {/* Nút Nạp tiền nổi bật trên mobile */}
                <button
                  onClick={() => navigateMobile('/wallet/recharge')}
                  className="w-full mb-3 h-11 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className={ICON_SM} />
                  Nạp tiền vào ví
                </button>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { href: '/orders', icon: <ShoppingBag className={ICON} />, label: 'Đơn hàng', bg: 'bg-blue-50', color: 'text-blue-600' },
                    { href: '/wallet', icon: <Wallet className={ICON} />, label: 'Ví tiền', bg: 'bg-green-50', color: 'text-green-600' },
                    { href: '/messages', icon: <MessageSquare className={ICON} />, label: 'Tin nhắn', bg: 'bg-purple-50', color: 'text-purple-600' },
                    { href: '/notifications', icon: <Bell className={ICON} />, label: 'Thông báo', bg: 'bg-orange-50', color: 'text-orange-600', badge: unreadNotifCount },
                  ].map((item) => (
                    <button key={item.href} onClick={() => navigateMobile(item.href)} className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} relative`}>
                        {item.icon}
                        {item.badge && item.badge > 0 ? (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-gray-600 font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Account Menu (logged in) ── */}
            {user && (
              <div className={`${SECTION_PAD} border-b border-gray-100`}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Tài khoản</p>
                <div className="space-y-0.5">
                  <button onClick={() => navigateMobile('/profile')} className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <User className={`${ICON} text-gray-500`} /> Thông tin cá nhân
                  </button>
                  <button onClick={() => navigateMobile('/cart')} className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <ShoppingCart className={`${ICON} text-gray-500`} />
                    <span className="flex-1 text-left">Giỏ hàng</span>
                    {cartCount > 0 && <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">{cartCount}</span>}
                  </button>
                  <button onClick={() => navigateMobile('/settings')} className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <Settings className={`${ICON} text-gray-500`} /> Cài đặt
                  </button>

                  {(user.role === 'SELLER' || user.isSeller) && (
                    <button onClick={() => navigateMobile('/seller')} className={`${MENU_ITEM} text-blue-700 hover:bg-blue-50`}>
                      <Store className={`${ICON} text-blue-600`} /> Quản lý cửa hàng
                    </button>
                  )}

                  {user.role === 'BUYER' && (
                    <button onClick={() => navigateMobile('/become-seller')} className={`${MENU_ITEM} text-green-700 hover:bg-green-50`}>
                      <UserPlus className={`${ICON} text-green-600`} /> Đăng ký bán hàng
                    </button>
                  )}

                  {user.role === 'ADMIN' && (
                    <button onClick={() => navigateMobile('/admin')} className={`${MENU_ITEM} text-purple-700 bg-purple-50 hover:bg-purple-100`}>
                      <Shield className={`${ICON} text-purple-600`} /> Quản trị hệ thống
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Categories ── */}
            <div className={`${SECTION_PAD} border-b border-gray-100`}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Danh mục sản phẩm</p>
              <div className="space-y-0.5">
                <button className={`${MENU_ITEM} text-blue-700 bg-blue-50 hover:bg-blue-100`} onClick={() => navigateMobile('/explore')}>
                  <Package className={`${ICON} text-blue-600`} /> Tất cả sản phẩm
                </button>
                {loadingCategories ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className={`${ICON} animate-spin text-gray-400`} />
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id}>
                      <button
                        className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50 justify-between`}
                        onClick={() => {
                          if (cat.children && cat.children.length > 0) {
                            setExpandedMobileCategory(expandedMobileCategory === cat.id ? null : cat.id);
                          } else {
                            handleCategoryClick(cat.id);
                          }
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-gray-400">{getCategoryIcon(cat.slug, ICON)}</span>
                          {cat.name}
                        </span>
                        {cat.children && cat.children.length > 0 && (
                          <ChevronDown className={`${ICON_SM} text-gray-400 transition-transform ${expandedMobileCategory === cat.id ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      {/* Sub-categories accordion */}
                      {expandedMobileCategory === cat.id && cat.children && cat.children.length > 0 && (
                        <div className="ml-4 pl-4 border-l-2 border-gray-100 space-y-0.5 pb-1" style={{ animation: 'slideDown 0.15s ease-out' }}>
                          {cat.children.map((child) => (
                            <button
                              key={child.id}
                              className={`${MENU_ITEM} text-gray-600 hover:text-blue-600 hover:bg-blue-50`}
                              onClick={() => handleCategoryClick(child.id)}
                            >
                              <span className="text-gray-400">{getCategoryIcon(child.slug)}</span>
                              {child.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Tools & Blogs ── */}
            <div className={`${SECTION_PAD} border-b border-gray-100`}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Tiện ích</p>
              <div className="space-y-0.5">
                <button className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`} onClick={() => navigateMobile('/tools')}>
                  <Wrench className={`${ICON} text-indigo-500`} />
                  <div className="text-left">
                    <span className="block">Công cụ tiện ích</span>
                    <span className="text-[11px] text-gray-400 font-normal">2FA, Check FB, Random...</span>
                  </div>
                </button>
                <button className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`} onClick={() => navigateMobile('/blogs')}>
                  <FileText className={`${ICON} text-teal-500`} />
                  <div className="text-left">
                    <span className="block">Blogs</span>
                    <span className="text-[11px] text-gray-400 font-normal">Tin tức, hướng dẫn</span>
                  </div>
                </button>
                <div className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50 cursor-pointer`}>
                  <ThemeToggleSimple />
                </div>
              </div>
            </div>

            {/* ── Contact (from admin settings) ── */}
            <div className={`${SECTION_PAD} border-b border-gray-100`}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">Liên hệ</p>
              <div className="space-y-0.5">
                {siteSettings?.contact?.phone && (
                  <a href={`tel:${siteSettings.contact.phone}`} className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <Phone className={`${ICON} text-blue-500`} />
                    <div className="text-left">
                      <span className="block">{siteSettings.contact.phone}</span>
                      <span className="text-[11px] text-gray-400 font-normal">Hotline hỗ trợ</span>
                    </div>
                  </a>
                )}
                {siteSettings?.contact?.email && (
                  <a href={`mailto:${siteSettings.contact.email}`} className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <Mail className={`${ICON} text-blue-500`} />
                    <div className="text-left">
                      <span className="block">{siteSettings.contact.email}</span>
                      <span className="text-[11px] text-gray-400 font-normal">Email hỗ trợ</span>
                    </div>
                  </a>
                )}
                {siteSettings?.social?.telegram && siteSettings.social.telegram !== '#' && (
                  <a href={siteSettings.social.telegram} target="_blank" rel="noopener noreferrer" className={`${MENU_ITEM} text-gray-700 hover:bg-gray-50`}>
                    <MessageSquare className={`${ICON} text-blue-500`} />
                    <div className="text-left">
                      <span className="block">Telegram</span>
                      <span className="text-[11px] text-gray-400 font-normal">Nhắn tin nhanh</span>
                    </div>
                  </a>
                )}
                {!siteSettings && (
                  <>
                    <div className={`${MENU_ITEM} text-gray-400`}>
                      <Loader2 className={`${ICON} animate-spin`} /> Đang tải thông tin...
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Logout (logged in) ── */}
            {user && (
              <div className={SECTION_PAD}>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
                >
                  <LogOut className={ICON_SM} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Verified Badge Popup Modal ═══════════════ */}
      {showVerifiedBanner && user?.isSeller && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity"
            onClick={() => {
              setShowVerifiedBanner(false);
              localStorage.setItem('header_verified_banner_dismissed', 'true');
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
              {/* Header gradient */}
              <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 pt-8 pb-10 text-center overflow-hidden">
                {/* Decorations */}
                <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
                <div className="absolute top-6 right-8 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-12 left-12 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-300" />
                <div className="absolute bottom-8 left-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-700" />

                {/* Close button */}
                <button
                  onClick={() => {
                    setShowVerifiedBanner(false);
                    localStorage.setItem('header_verified_banner_dismissed', 'true');
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>

                {/* Badge icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 mb-4">
                  <BadgeCheck className="w-10 h-10 text-white" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-800" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white mb-2 relative">Nhận Tích Xanh Xác Minh!</h2>
                <p className="text-sm text-blue-100 relative max-w-xs mx-auto leading-relaxed">
                  Gian hàng có tích xanh được ưu tiên hiển thị, tăng uy tín và thu hút nhiều khách hàng hơn
                </p>
              </div>

              {/* Benefits */}
              <div className="px-6 py-5 space-y-3">
                {[
                  { icon: '🛡️', text: 'Xây dựng uy tín với khách hàng' },
                  { icon: '📈', text: 'Tăng doanh số bán hàng' },
                  { icon: '⭐', text: 'Nổi bật trên sàn BachHoaMMO' },
                  { icon: '💎', text: 'Hoàn toàn miễn phí' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 space-y-2">
                <Link
                  href="/seller/insurance"
                  onClick={() => {
                    setShowVerifiedBanner(false);
                    localStorage.setItem('header_verified_banner_dismissed', 'true');
                  }}
                  className="w-full flex items-center justify-center gap-2 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/25"
                >
                  <BadgeCheck className="w-4.5 h-4.5" />
                  Tìm hiểu cách nhận tích xanh
                </Link>
                <button
                  onClick={() => {
                    setShowVerifiedBanner(false);
                    localStorage.setItem('header_verified_banner_dismissed', 'true');
                  }}
                  className="w-full h-10 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors rounded-xl hover:bg-gray-50"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </header>
  );
}
