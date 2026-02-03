'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchBar } from './SearchBar';
import { Button } from './ui/button';
import { UserProfileMenu } from './UserProfileMenu';
import { useCartStore } from '@/store/cartStore';
import { 
  ShoppingCart, Menu, X, Phone, Mail, ChevronDown, ChevronRight, User, LogIn, Shield, Gavel, Loader2,
  Folder, MonitorPlay, Cpu, Music, MessageCircle, Video, GraduationCap, Globe, Package, Layers, Wrench
} from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { apiFetch } from '@/lib/config';

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

// Icon mapping for categories
const getCategoryIcon = (slug: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'tai-khoan': <Folder className="w-5 h-5" />,
    'phan-mem': <Cpu className="w-5 h-5" />,
    'dich-vu': <Layers className="w-5 h-5" />,
    'khac': <Package className="w-5 h-5" />,
    'tai-khoan-netflix': <MonitorPlay className="w-4 h-4" />,
    'tai-khoan-spotiffy': <Music className="w-4 h-4" />,
    'tai-khoan-facebook': <MessageCircle className="w-4 h-4" />,
    'tai-khoan-youtube': <Video className="w-4 h-4" />,
    'tai-khoan-telegram': <MessageCircle className="w-4 h-4" />,
    'tai-khoan-ai': <Cpu className="w-4 h-4" />,
    'tai-khoan-canva': <Layers className="w-4 h-4" />,
    'tai-khoan-cap-cut': <Video className="w-4 h-4" />,
    'tai-khoan-hoc-tap': <GraduationCap className="w-4 h-4" />,
    'tai-khoan-vpn-proxy': <Globe className="w-4 h-4" />,
    'tai-khoan-adobe': <Layers className="w-4 h-4" />,
    'key-van-phong-do-hoa': <Cpu className="w-4 h-4" />,
  };
  return iconMap[slug] || <Folder className="w-4 h-4" />;
};

interface HeaderProps {
  user: any;
  onLogout: () => void;
  onSearch?: (query: string) => void;
}

export function Header({ user, onLogout, onSearch }: HeaderProps) {
  const router = useRouter();
  const { getTotalItems } = useCartStore();
  const cartCount = getTotalItems();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Fetch categories from API (with hierarchy)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiFetch('/categories?parent=true');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Handle search - navigate to explore page
  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
    // Also call the prop callback if provided
    if (onSearch) onSearch(query);
  };

  // Handle category click - navigate to explore page with category filter
  const handleCategoryClick = (categoryId: string) => {
    setShowCategories(false);
    setMobileMenuOpen(false);
    router.push(`/explore?category=${categoryId}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Auction Banner for Sellers */}
      {user?.isSeller && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="container mx-auto px-4 py-1.5">
            <Link href="/auction" className="flex items-center justify-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity">
              <Gavel className="w-4 h-4" />
              <span>Đấu giá TOP Shop đang diễn ra!</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs">Tham gia ngay</span>
            </Link>
          </div>
        </div>
      )}
      {/* Single Main Header Bar */}
      <div className="border-b border-gray-100">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16 lg:h-18 gap-4">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <img 
                src="/images/logobachhoa.png" 
                alt="BachHoaMMO Logo" 
                className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg shadow-md group-hover:shadow-lg transition-shadow object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900 leading-tight">
                  BachHoa<span className="text-blue-600">MMO</span>
                </h1>
                <p className="text-[10px] lg:text-xs text-gray-500 -mt-0.5">Chợ MMO uy tín #1</p>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
              <div className="relative w-full flex">
                {/* Category Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategories(!showCategories)}
                    className="h-11 px-4 bg-gray-50 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>Danh mục</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCategories && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[600px]">
                      <div className="flex">
                        {/* Left: Parent Categories */}
                        <div className="w-48 border-r border-gray-100 py-2">
                          <button
                            className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium flex items-center gap-3"
                            onClick={() => { setShowCategories(false); router.push('/explore'); }}
                          >
                            <Package className="w-5 h-5 text-blue-500" />
                            Tất cả sản phẩm
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          {loadingCategories ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                          ) : categories.length > 0 ? (
                            categories.map((cat) => (
                              <button
                                key={cat.id}
                                className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between gap-2 ${
                                  hoveredCategory === cat.id 
                                    ? 'bg-blue-50 text-blue-600' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                                onMouseEnter={() => setHoveredCategory(cat.id)}
                                onClick={() => handleCategoryClick(cat.id)}
                              >
                                <span className="flex items-center gap-3">
                                  <span className={hoveredCategory === cat.id ? 'text-blue-500' : 'text-gray-400'}>
                                    {getCategoryIcon(cat.slug)}
                                  </span>
                                  {cat.name}
                                </span>
                                {cat.children && cat.children.length > 0 && (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                            ))
                          ) : (
                            <p className="px-4 py-2 text-sm text-gray-500">Chưa có danh mục</p>
                          )}
                        </div>
                        
                        {/* Right: Child Categories */}
                        <div className="flex-1 p-4 bg-gray-50/50 min-h-[200px]">
                          {hoveredCategory ? (
                            <>
                              {categories.find(c => c.id === hoveredCategory)?.children?.length ? (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    {categories.find(c => c.id === hoveredCategory)?.name}
                                  </p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {categories.find(c => c.id === hoveredCategory)?.children?.map((child) => (
                                      <button
                                        key={child.id}
                                        className="px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-white hover:text-blue-600 rounded-lg transition-colors flex items-center gap-2"
                                        onClick={() => handleCategoryClick(child.id)}
                                      >
                                        <span className="text-gray-400">
                                          {getCategoryIcon(child.slug)}
                                        </span>
                                        {child.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                  Chưa có danh mục con
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                              <div className="text-center">
                                <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>Di chuột vào danh mục để xem chi tiết</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Search Input */}
                <div className="flex-1">
                  <SearchBar 
                    onSearch={handleSearch} 
                    placeholder="Tìm kiếm sản phẩm, dịch vụ..." 
                  />
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
              {/* Tools Link - Desktop */}
              <Link href="/tools" className="hidden lg:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                >
                  <Wrench className="w-4 h-4 mr-1.5" />
                  Công cụ
                </Button>
              </Link>

              {isLoading ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 animate-pulse rounded-full"></div>
                  <div className="hidden sm:block w-16 h-10 bg-gray-100 animate-pulse rounded-lg"></div>
                </div>
              ) : user ? (
                <>
                  {user.role === 'ADMIN' && (
                    <Link href="/admin" className="hidden sm:block">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg shadow-sm"
                      >
                        <Shield className="w-4 h-4 mr-1.5" />
                        Admin
                      </Button>
                    </Link>
                  )}

                  {/* Notifications */}
                  <NotificationDropdown />
                  
                  {/* Cart - Always visible, optimized for mobile */}
                  <Link href="/cart" aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 sm:h-10 sm:w-10 lg:w-auto lg:px-4 rounded-lg hover:bg-gray-100 flex-shrink-0"
                    >
                      <ShoppingCart className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-gray-700" />
                      <span className="hidden lg:inline ml-2 text-gray-700">Giỏ hàng</span>
                      {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[9px] sm:text-[10px] flex items-center justify-center rounded-full font-semibold shadow-sm">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  
                  {/* User Profile Menu - Optimized for mobile */}
                  <UserProfileMenu user={user} onLogout={onLogout} />
                </>
              ) : (
                <>
                  {/* Login Button - Icon only on small mobile */}
                  <Link href="/login" aria-label="Đăng nhập">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors flex-shrink-0"
                    >
                      <LogIn className="w-[18px] h-[18px] sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Đăng nhập</span>
                    </Button>
                  </Link>
                  
                  {/* Register Button - Icon only on small mobile */}
                  <Link href="/register" className="hidden xs:block" aria-label="Đăng ký tài khoản">
                    <Button
                      size="sm"
                      className="h-9 sm:h-10 px-3 sm:px-4 lg:px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all hover:shadow-md flex-shrink-0"
                    >
                      <User className="w-[18px] h-[18px] sm:w-4 sm:h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Đăng ký</span>
                    </Button>
                  </Link>
                  
                  {/* Cart - Always visible */}
                  <Link href="/cart" aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg hover:bg-gray-100 flex-shrink-0"
                    >
                      <ShoppingCart className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-gray-700" />
                      {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[9px] sm:text-[10px] flex items-center justify-center rounded-full font-semibold shadow-sm">
                          {cartCount > 99 ? '99+' : cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={mobileMenuOpen}
                className="md:hidden h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-gray-700" />
                ) : (
                  <Menu className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <SearchBar onSearch={handleSearch} placeholder="Tìm kiếm sản phẩm..." />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            {/* Categories - Mobile with Accordion */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Danh mục</p>
              <div className="space-y-2">
                <button
                  className="w-full px-3 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-left font-medium flex items-center gap-2"
                  onClick={() => { setMobileMenuOpen(false); router.push('/explore'); }}
                >
                  <Package className="w-4 h-4" />
                  Tất cả sản phẩm
                </button>
                {loadingCategories ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="bg-gray-50 rounded-lg overflow-hidden">
                      <button
                        className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors text-left font-medium flex items-center justify-between"
                        onClick={() => handleCategoryClick(cat.id)}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-gray-400">{getCategoryIcon(cat.slug)}</span>
                          {cat.name}
                        </span>
                        {cat.children && cat.children.length > 0 && (
                          <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                            {cat.children.length}
                          </span>
                        )}
                      </button>
                      {cat.children && cat.children.length > 0 && (
                        <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                          {cat.children.slice(0, 6).map((child) => (
                            <button
                              key={child.id}
                              className="px-2 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors text-left truncate"
                              onClick={() => handleCategoryClick(child.id)}
                            >
                              {child.name.replace('Tài khoản ', '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Tools Link - Mobile */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Công cụ</p>
              <button
                className="w-full px-3 py-2.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-left font-medium flex items-center gap-2"
                onClick={() => { setMobileMenuOpen(false); router.push('/tools'); }}
              >
                <Wrench className="w-4 h-4" />
                Công cụ tiện ích (2FA, Check FB)
              </button>
            </div>

            {/* Quick Links */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Liên hệ</p>
              <div className="space-y-2">
                <a href="tel:0123456789" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span></span>
                </a>
                <a href="mailto:support@BachHoaMMO.vn" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>support@BachHoaMMO.vn</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {showCategories && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowCategories(false)}
        />
      )}
    </header>
  );
}
