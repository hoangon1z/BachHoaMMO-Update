'use client';

import { useEffect, useState } from 'react';
import { Store, CheckCircle, XCircle, Eye, User, Star, ShoppingBag, Package, Wallet, BadgeCheck } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, Pagination } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

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
  };
  _count?: {
    products: number;
    sales: number;
  };
}

export default function AdminSellersPage() {
  const toast = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSellers();
  }, [pagination.offset]);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

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

  const handleToggleSellerStatus = async (seller: Seller) => {
    try {
      const token = localStorage.getItem('token');
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
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const filteredSellers = sellers.filter(s =>
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sellerProfile?.shopName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSellers.length / itemsPerPage);
  const paginatedSellers = filteredSellers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
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
      ) : paginatedSellers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<Store className="w-10 h-10 text-gray-400" />}
            title="Không có người bán"
            description="Không tìm thấy người bán nào phù hợp"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedSellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all">
              {/* Header with gradient */}
              <div className="h-20 bg-amber-500 relative">
                <div className="absolute -bottom-8 left-6">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                    <User className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
                {seller.sellerProfile?.isVerified && (
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
                    onClick={() => handleToggleSellerStatus(seller)}
                    className={seller.role === 'SELLER' ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'hover:bg-green-50 hover:text-green-600 hover:border-green-200'}
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
      {!isLoading && filteredSellers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSellers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
