'use client';

import { useEffect, useState, useCallback } from 'react';
import { Store, CheckCircle, XCircle, Eye, User, Star, ShoppingBag, Package, Wallet, BadgeCheck, Trash2, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, Pagination } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Seller {
  id: string;
  email: string;
  name?: string;
  role: string;
  isSeller: boolean;
  balance: number;
  createdAt: string;
  sellerProfile?: {
    id: string;
    shopName: string;
    rating: number;
    totalSales: number;
    isVerified: boolean;
    insuranceLevel?: number;
    insuranceTier?: string;
  };
  _count?: {
    products: number;
    sales: number;
  };
}

export default function AdminSellersPage() {
  const toast = useToast();
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const itemsPerPage = 12;
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'verify' | 'toggle' | 'revoke-all' | null;
    seller: Seller | null;
    isProcessing: boolean;
  }>({ isOpen: false, type: null, seller: null, isProcessing: false });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
      setPagination(prev => ({ ...prev, offset: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch sellers when search or pagination changes
  useEffect(() => {
    fetchSellers();
  }, [debouncedSearch, currentPage]);

  const fetchSellers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      const response = await fetch(`/api/admin/sellers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers);
        setPagination(prev => ({ ...prev, total: data.total }));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start chat with seller
  const handleStartChat = async (seller: Seller) => {
    try {
      setIsStartingChat(seller.id);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/chat/start-with-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sellerId: seller.id,
          message: `Xin chào ${seller.sellerProfile?.shopName || seller.name || seller.email}! Admin liên hệ với bạn.`,
        }),
      });

      const data = await response.json();
      if (data.success && data.conversation) {
        router.push(`/admin/messages?id=${data.conversation._id}`);
      } else {
        toast.error(data.message || 'Không thể bắt đầu cuộc trò chuyện');
      }
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('Có lỗi xảy ra khi mở chat');
    } finally {
      setIsStartingChat(null);
    }
  };

  // Open confirmation dialog for toggle seller status
  const openToggleConfirm = (seller: Seller) => {
    setConfirmDialog({ isOpen: true, type: 'toggle', seller, isProcessing: false });
  };

  // Open confirmation dialog for verify seller
  const openVerifyConfirm = (seller: Seller) => {
    if (!seller.sellerProfile) {
      toast.error('Seller chưa tạo shop');
      return;
    }
    setConfirmDialog({ isOpen: true, type: 'verify', seller, isProcessing: false });
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    if (!confirmDialog.isProcessing) {
      setConfirmDialog({ isOpen: false, type: null, seller: null, isProcessing: false });
    }
  };

  // Execute confirmed action
  const executeConfirmedAction = async () => {
    if (!confirmDialog.seller || !confirmDialog.type) return;

    setConfirmDialog(prev => ({ ...prev, isProcessing: true }));

    try {
      const token = localStorage.getItem('token');
      const seller = confirmDialog.seller;

      if (confirmDialog.type === 'toggle') {
        const newRole = seller.role === 'SELLER' ? 'BUYER' : 'SELLER';
        const response = await fetch(`/api/admin/sellers/${seller.id}/status`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: newRole,
            isSeller: newRole === 'SELLER',
          }),
        });

        if (response.ok) {
          toast.success(`Đã ${newRole === 'SELLER' ? 'kích hoạt' : 'vô hiệu hóa'} quyền bán hàng`);
          fetchSellers();
        } else {
          toast.error('Có lỗi xảy ra');
        }
      } else if (confirmDialog.type === 'verify') {
        const newVerified = !seller.sellerProfile?.isVerified;
        const response = await fetch(`/api/admin/sellers/${seller.id}/verify`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isVerified: newVerified }),
        });

        if (response.ok) {
          toast.success(newVerified ? 'Đã xác minh seller' : 'Đã hủy xác minh seller');
          fetchSellers();
        } else {
          const data = await response.json();
          toast.error(data.message || 'Có lỗi xảy ra');
        }
      } else if (confirmDialog.type === 'revoke-all') {
        const response = await fetch('/api/admin/sellers/revoke-all-badges', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          toast.success(data.message || 'Đã thu hồi toàn bộ tích xanh');
          fetchSellers();
        } else {
          toast.error('Có lỗi xảy ra');
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setConfirmDialog({ isOpen: false, type: null, seller: null, isProcessing: false });
    }
  };

  // Get confirmation dialog content based on action type
  const getConfirmDialogContent = () => {
    if (confirmDialog.type === 'revoke-all') {
      return {
        title: 'Thu hồi toàn bộ tích xanh?',
        message: 'Hành động này sẽ gỡ tích xanh xác minh của TẤT CẢ seller. Hệ thống sẽ chuyển sang phương thức Bảo Hiểm mới. Không thể hoàn tác!',
        confirmText: 'Thu hồi tất cả',
        icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
        buttonClass: 'bg-red-600 hover:bg-red-700'
      };
    }

    if (!confirmDialog.seller) return { title: '', message: '', confirmText: '', icon: null, buttonClass: '' };

    const seller = confirmDialog.seller;

    if (confirmDialog.type === 'toggle') {
      const isDisabling = seller.role === 'SELLER';
      return {
        title: isDisabling ? 'Vô hiệu hóa quyền bán hàng?' : 'Kích hoạt quyền bán hàng?',
        message: isDisabling
          ? `Bạn có chắc muốn vô hiệu hóa quyền bán hàng của "${seller.name || seller.email}"? Người này sẽ không thể bán hàng cho đến khi được kích hoạt lại.`
          : `Bạn có chắc muốn kích hoạt quyền bán hàng cho "${seller.name || seller.email}"?`,
        confirmText: isDisabling ? 'Vô hiệu hóa' : 'Kích hoạt',
        icon: isDisabling ? <XCircle className="w-6 h-6 text-red-500" /> : <CheckCircle className="w-6 h-6 text-green-500" />,
        buttonClass: isDisabling ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
      };
    } else if (confirmDialog.type === 'verify') {
      const isRemoving = seller.sellerProfile?.isVerified;
      return {
        title: isRemoving ? 'Hủy xác minh seller?' : 'Xác minh seller?',
        message: isRemoving
          ? `Bạn có chắc muốn hủy xác minh của "${seller.sellerProfile?.shopName || seller.name}"? Shop này sẽ mất huy hiệu xác minh.`
          : `Bạn có chắc muốn xác minh shop "${seller.sellerProfile?.shopName || seller.name}"? Shop này sẽ được hiển thị huy hiệu xác minh.`,
        confirmText: isRemoving ? 'Hủy xác minh' : 'Xác minh',
        icon: <BadgeCheck className={`w-6 h-6 ${isRemoving ? 'text-amber-500' : 'text-blue-500'}`} />,
        buttonClass: isRemoving ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
      };
    }

    return { title: '', message: '', confirmText: '', icon: null, buttonClass: '' };
  };

  // Open revoke all badges dialog
  const openRevokeAllConfirm = () => {
    setConfirmDialog({ isOpen: true, type: 'revoke-all', seller: null, isProcessing: false });
  };

  const totalPages = Math.ceil(pagination.total / itemsPerPage);

  const stats = {
    total: pagination.total,
    verified: sellers.filter(s => s.sellerProfile?.isVerified).length,
    totalProducts: sellers.reduce((sum, s) => sum + (s._count?.products || 0), 0),
    totalOrders: sellers.reduce((sum, s) => sum + (s._count?.sales || 0), 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người bán"
        description="Quản lý tất cả người bán trên hệ thống"
        icon={<Store className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Người bán' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng người bán"
          value={stats.total}
          icon={<Store className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Đã xác minh"
          value={stats.verified}
          icon={<BadgeCheck className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Tổng sản phẩm"
          value={stats.totalProducts}
          icon={<Package className="w-6 h-6" />}
          color="amber"
        />
        <StatsCard
          title="Tổng đơn hàng"
          value={stats.totalOrders}
          icon={<ShoppingBag className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Revoke all old badges button */}
      {stats.verified > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800">Thu hồi hệ thống tích xanh cũ</p>
            <p className="text-sm text-red-600">Gỡ toàn bộ tích xanh cũ ({stats.verified} seller) để chuyển sang hệ thống Bảo Hiểm mới</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={openRevokeAllConfirm}
            className="border-red-300 text-red-700 hover:bg-red-100 whitespace-nowrap"
          >
            Thu hồi tất cả
          </Button>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
        }}
        searchPlaceholder="Tìm kiếm theo email, tên, tên shop..."
        showClearButton
        onClearFilters={() => {
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      {/* Sellers Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải danh sách người bán...</p>
          </div>
        </div>
      ) : sellers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<Store className="w-10 h-10 text-gray-400" />}
            title="Không có người bán"
            description={debouncedSearch ? `Không tìm thấy seller nào với từ khóa "${debouncedSearch}"` : "Không tìm thấy người bán nào phù hợp"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all">
              {/* Header with gradient */}
              <div className="h-20 bg-amber-500 relative">
                <div className="absolute -bottom-8 left-6">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <User className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                {seller.sellerProfile?.insuranceTier ? (
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                      <BadgeCheck className="w-3 h-3" />
                      BH {({ 'BRONZE': 'Đồng', 'SILVER': 'Bạc', 'GOLD': 'Vàng', 'DIAMOND': 'K.Cương', 'VIP': 'VIP' } as Record<string, string>)[seller.sellerProfile.insuranceTier] || seller.sellerProfile.insuranceTier}
                    </div>
                  </div>
                ) : seller.sellerProfile?.isVerified && (
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                      <BadgeCheck className="w-3 h-3" />
                      Đã xác minh
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="pt-12 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{seller.name || 'N/A'}</h3>
                    <p className="text-sm text-gray-500">{seller.email}</p>
                  </div>
                  {seller.role === 'SELLER' ? (
                    <StatusBadge variant="success" dot>Hoạt động</StatusBadge>
                  ) : (
                    <StatusBadge variant="default" dot>Vô hiệu</StatusBadge>
                  )}
                </div>

                {seller.sellerProfile ? (
                  <div className="p-3 bg-gray-50 rounded-xl mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-gray-900">{seller.sellerProfile.shopName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {seller.sellerProfile.rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-sm text-gray-400">/ 5.0</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl mb-4 text-center">
                    <span className="text-sm text-gray-400">Chưa tạo shop</span>
                  </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-blue-50 rounded-xl">
                    <p className="text-lg font-bold text-blue-600">{seller._count?.products || 0}</p>
                    <p className="text-xs text-gray-500">Sản phẩm</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-xl">
                    <p className="text-lg font-bold text-green-600">{seller._count?.sales || 0}</p>
                    <p className="text-xs text-gray-500">Đơn hàng</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded-xl">
                    <p className="text-sm font-bold text-purple-600">{(seller.balance / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-gray-500">Số dư</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link href={`/admin/users/${seller.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      Chi tiết
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartChat(seller)}
                    disabled={isStartingChat === seller.id}
                    className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    title="Nhắn tin cho seller"
                  >
                    {isStartingChat === seller.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </Button>
                  {seller.sellerProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openVerifyConfirm(seller)}
                      className={seller.sellerProfile.isVerified
                        ? 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                        : 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}
                      title={seller.sellerProfile.isVerified ? 'Hủy xác minh' : 'Xác minh seller'}
                    >
                      <BadgeCheck className={`w-4 h-4 ${seller.sellerProfile.isVerified ? 'text-green-500' : 'text-gray-400'}`} />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openToggleConfirm(seller)}
                    className={seller.role === 'SELLER' ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'hover:bg-green-50 hover:text-green-600 hover:border-green-200'}
                    title={seller.role === 'SELLER' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                  >
                    {seller.role === 'SELLER' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && sellers.length > 0 && totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeConfirmDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header with icon */}
            <div className="p-6 pb-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                {getConfirmDialogContent().icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">
                {getConfirmDialogContent().title}
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              <p className="text-gray-600 text-center text-sm leading-relaxed">
                {getConfirmDialogContent().message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeConfirmDialog}
                disabled={confirmDialog.isProcessing}
              >
                Bỏ qua
              </Button>
              <Button
                className={`flex-1 text-white ${getConfirmDialogContent().buttonClass}`}
                onClick={executeConfirmedAction}
                disabled={confirmDialog.isProcessing}
              >
                {confirmDialog.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  getConfirmDialogContent().confirmText
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
