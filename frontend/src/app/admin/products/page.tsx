'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Search, Eye, Trash2, CheckCircle, XCircle, Store, Tag, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, Pagination, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number;
  status: string;
  images: string;
  sales: number;
  category: { id: string; name: string };
  seller: { id: string; name: string; email: string };
  createdAt: string;
}

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string | null }>({ isOpen: false, productId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, [statusFilter, pagination.offset]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/admin/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(prev => ({ ...prev, total: data.total }));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/products/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('Cập nhật trạng thái thành công');
        fetchProducts();
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.productId) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/products/${deleteModal.productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('Đã xóa sản phẩm');
        fetchProducts();
        setDeleteModal({ isOpen: false, productId: null });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <StatusBadge variant="success" dot>Đang bán</StatusBadge>;
      case 'INACTIVE':
        return <StatusBadge variant="default" dot>Ngừng bán</StatusBadge>;
      case 'OUT_OF_STOCK':
        return <StatusBadge variant="error" dot>Hết hàng</StatusBadge>;
      default:
        return <StatusBadge variant="default">{status}</StatusBadge>;
    }
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seller?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seller?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: pagination.total,
    active: products.filter(p => p.status === 'ACTIVE').length,
    inactive: products.filter(p => p.status === 'INACTIVE').length,
    outOfStock: products.filter(p => p.status === 'OUT_OF_STOCK').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý sản phẩm"
        description="Quản lý tất cả sản phẩm trên hệ thống"
        icon={<Package className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Sản phẩm' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng sản phẩm"
          value={stats.total}
          icon={<Package className="w-6 h-6" />}
          color="blue"
        />
        <StatsCard
          title="Đang bán"
          value={stats.active}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Ngừng bán"
          value={stats.inactive}
          icon={<XCircle className="w-6 h-6" />}
          color="orange"
        />
        <StatsCard
          title="Hết hàng"
          value={stats.outOfStock}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Tìm kiếm sản phẩm, người bán..."
        filters={[
          {
            key: 'status',
            label: 'Tất cả trạng thái',
            value: statusFilter,
            options: [
              { value: 'ACTIVE', label: 'Đang bán' },
              { value: 'INACTIVE', label: 'Ngừng bán' },
              { value: 'OUT_OF_STOCK', label: 'Hết hàng' },
            ],
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
          },
        ]}
        showClearButton
        onClearFilters={() => {
          setStatusFilter('');
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải sản phẩm...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="w-10 h-10 text-gray-400" />}
            title="Không có sản phẩm"
            description="Không tìm thấy sản phẩm nào phù hợp"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Người bán</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Giá</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Kho</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Đã bán</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedProducts.map((product) => {
                    let images: string[] = [];
                    try { images = JSON.parse(product.images); } catch {}

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                              {images[0] ? (
                                <img src={images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-xs">{product.title}</p>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Tag className="w-3 h-3" />
                                <span>{product.category?.name || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Store className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{product.seller?.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{product.seller?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-gray-900">
                            {product.price.toLocaleString('vi-VN')}đ
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`font-semibold ${product.stock > 0 ? 'text-gray-700' : 'text-red-600'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="font-semibold text-gray-700">{product.sales}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {getStatusBadge(product.status)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/products/${product.id}`} target="_blank">
                              <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {product.status === 'ACTIVE' ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="hover:bg-red-50"
                                onClick={() => handleUpdateStatus(product.id, 'INACTIVE')}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-green-50"
                                onClick={() => handleUpdateStatus(product.id, 'ACTIVE')}
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="hover:bg-red-50"
                              onClick={() => setDeleteModal({ isOpen: true, productId: product.id })}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        onConfirm={handleDelete}
        title="Xóa sản phẩm"
        description="Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
