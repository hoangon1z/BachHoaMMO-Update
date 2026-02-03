'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { normalizeProduct } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  stock: number;
  status: string;
  images: string;
  sales: number;
  views: number;
  category: { name: string };
  createdAt: string;
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; productId: string | null; productTitle: string }>({
    isOpen: false,
    productId: null,
    productTitle: '',
  });
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, statusFilter]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/products?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts((data.products || []).map((p: any) => normalizeProduct(p)));
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/products/${productId}`,
        {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        // Update product in local state without refetching
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, status: newStatus } : p
        ));
      } else {
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleDeleteClick = (productId: string, productTitle: string) => {
    setDeleteDialog({ isOpen: true, productId, productTitle });
    setOpenMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.productId) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/products/${deleteDialog.productId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        // Xóa khỏi danh sách (sản phẩm đã bị xóa hẳn khỏi DB)
        setProducts(prev => prev.filter(p => p.id !== deleteDialog.productId));
        setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        setDeleteDialog({ isOpen: false, productId: null, productTitle: '' });
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
        setErrorDialog({ isOpen: true, message: data.message || 'Có lỗi xảy ra khi xóa sản phẩm' });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setDeleteDialog(prev => ({ ...prev, isOpen: false }));
      setErrorDialog({ isOpen: true, message: 'Có lỗi xảy ra khi xóa sản phẩm' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/products/${productId}/stock`,
        {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ stock: newStock }),
        }
      );
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Đang bán</span>;
      case 'INACTIVE':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Ngừng bán</span>;
      case 'OUT_OF_STOCK':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Hết hàng</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-gray-600">Quản lý tất cả sản phẩm của bạn</p>
        </div>
        <Link href="/seller/products/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Thêm sản phẩm
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang bán</option>
            <option value="INACTIVE">Ngừng bán</option>
            <option value="OUT_OF_STOCK">Hết hàng</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Chưa có sản phẩm nào</p>
            <Link href="/seller/products/new">
              <Button>Thêm sản phẩm đầu tiên</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Giá</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Đã bán</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    let images: string[] = [];
                    try {
                      images = JSON.parse(product.images);
                    } catch {}
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {images[0] ? (
                                <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-xs">{product.title}</p>
                              <p className="text-sm text-gray-500">{product.category?.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{product.price.toLocaleString('vi-VN')}đ</p>
                            {product.originalPrice && (
                              <p className="text-sm text-gray-500 line-through">{product.originalPrice.toLocaleString('vi-VN')}đ</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={product.stock}
                              onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0)}
                              className="w-20 h-8 px-2 border border-gray-200 rounded text-sm text-center"
                              min="0"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{product.sales}</p>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(product.status)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/seller/products/${product.id}/inventory`}>
                              <Button variant="ghost" size="sm" title="Quản lý kho">
                                <Package className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/products/${product.id}`} target="_blank">
                              <Button variant="ghost" size="sm" title="Xem sản phẩm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/seller/products/${product.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Chỉnh sửa">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteClick(product.id, product.title)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                let images: string[] = [];
                try {
                  images = JSON.parse(product.images);
                } catch {}

                return (
                  <div key={product.id} className="p-4">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {images[0] ? (
                          <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{product.title}</p>
                        <p className="text-sm text-gray-500">{product.category?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-semibold text-blue-600">{product.price.toLocaleString('vi-VN')}đ</p>
                          {getStatusBadge(product.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Kho: {product.stock}</span>
                          <span>Đã bán: {product.sales}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        {openMenu === product.id && (
                          <div className="absolute right-0 top-10 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <Link href={`/seller/products/${product.id}/edit`} className="block px-4 py-2 text-sm hover:bg-gray-50">
                              Chỉnh sửa
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(product.id, product.title)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, productId: null, productTitle: '' })}
        onConfirm={handleDeleteConfirm}
        title="Xóa sản phẩm"
        description={`Bạn có chắc muốn xóa sản phẩm "${deleteDialog.productTitle}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa sản phẩm"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
        icon={<Trash2 className="w-7 h-7" />}
      />

      {/* Error Dialog (khi xóa thất bại, VD: sản phẩm đã có đơn hàng) */}
      <ConfirmDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        title="Không thể xóa"
        description={errorDialog.message}
        variant="warning"
        alertMode
        icon={<AlertCircle className="w-7 h-7" />}
      />
    </div>
  );
}

