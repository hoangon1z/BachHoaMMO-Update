'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface VariantStat {
  variantId: string;
  variantName: string;
  availableCount: number;
}

interface InventoryItem {
  id: string;
  accountData: string;
  status: string;
  variantId: string | null;
  variant: { id: string; name: string } | null;
  soldAt: string | null;
  soldTo: { id: string; name: string; email: string } | null;
  createdAt: string;
}

interface InventoryStats {
  AVAILABLE: number;
  RESERVED: number;
  SOLD: number;
  DISABLED: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  stock: number;
  accountTemplateId: string | null;
  hasVariants?: boolean;
}

export default function InventoryPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { user } = useAuthStore();
  const toast = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ AVAILABLE: 0, RESERVED: 0, SOLD: 0, DISABLED: 0 });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantStats, setVariantStats] = useState<VariantStat[]>([]);
  const [hasVariants, setHasVariants] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [variantFilter, setVariantFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadVariantId, setUploadVariantId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Add single modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [singleAccountData, setSingleAccountData] = useState('');
  const [singleVariantId, setSingleVariantId] = useState('');

  // Edit modal
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editAccountData, setEditAccountData] = useState('');

  // View password
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Delete confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | null;
    inventoryId: string | null;
  }>({ isOpen: false, type: null, inventoryId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProduct();
      fetchInventory();
    }
  }, [user, productId, statusFilter, variantFilter]);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let urlPath = `/api/seller/products/${productId}/inventory?limit=100`;
      if (statusFilter) urlPath += `&status=${statusFilter}`;
      if (variantFilter) urlPath += `&variantId=${variantFilter}`;

      const res = await fetch(urlPath, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory);
        setStats(data.stats);
        setTotal(data.total);
        setVariants(data.variants || []);
        setVariantStats(data.variantStats || []);
        setHasVariants(data.hasVariants || false);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadText.trim()) return;

    // Validate variant selection for products with variants
    if (hasVariants && variants.length > 0 && !uploadVariantId) {
      toast.warning('Chưa chọn phân loại', 'Vui lòng chọn phân loại sản phẩm trước khi thêm kho');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/products/${productId}/inventory/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accountData: uploadText,
          variantId: uploadVariantId || undefined,
        }),
      });

      const data = await res.json();
      setUploadResult(data);

      if (res.ok) {
        fetchInventory();
        if (data.success > 0) {
          setUploadText('');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResult({ error: 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSingle = async () => {
    if (!singleAccountData.trim()) return;

    // Validate variant selection for products with variants
    if (hasVariants && variants.length > 0 && !singleVariantId) {
      toast.warning('Chưa chọn phân loại', 'Vui lòng chọn phân loại sản phẩm trước khi thêm kho');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/products/${productId}/inventory`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accountData: singleAccountData,
          variantId: singleVariantId || undefined,
        }),
      });

      if (res.ok) {
        fetchInventory();
        setSingleAccountData('');
        setSingleVariantId('');
        setShowAddModal(false);
        toast.success('Thành công', 'Đã thêm tài khoản vào kho');
      } else {
        const data = await res.json();
        // Parse error message for user-friendly display
        const errorMsg = data.message || 'Có lỗi xảy ra';
        if (errorMsg.includes('Unique constraint') || errorMsg.includes('trùng') || errorMsg.includes('duplicate')) {
          toast.error('Tài khoản trùng lặp', 'Tài khoản này đã tồn tại trong kho');
        } else {
          toast.error('Lỗi', errorMsg);
        }
      }
    } catch (error) {
      console.error('Add failed:', error);
      toast.error('Lỗi', 'Không thể thêm tài khoản. Vui lòng thử lại.');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountData: editAccountData }),
      });

      if (res.ok) {
        fetchInventory();
        setEditingItem(null);
        toast.success('Thành công', 'Đã cập nhật tài khoản');
      } else {
        const data = await res.json();
        toast.error('Lỗi', data.message || 'Không thể cập nhật tài khoản');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Lỗi', 'Không thể cập nhật tài khoản. Vui lòng thử lại.');
    }
  };

  const handleDeleteItemClick = (inventoryId: string) => {
    setDeleteDialog({ isOpen: true, type: 'single', inventoryId });
  };

  const handleBulkDeleteClick = () => {
    if (selectedItems.size === 0) return;
    setDeleteDialog({ isOpen: true, type: 'bulk', inventoryId: null });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');

      if (deleteDialog.type === 'single' && deleteDialog.inventoryId) {
        const res = await fetch(`/api/seller/inventory/${deleteDialog.inventoryId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          fetchInventory();
          toast.success('Đã xóa', 'Tài khoản đã được xóa khỏi kho');
          setDeleteDialog({ isOpen: false, type: null, inventoryId: null });
        } else {
          const data = await res.json();
          toast.error('Lỗi', data.message || 'Không thể xóa tài khoản');
        }
      } else if (deleteDialog.type === 'bulk') {
        const res = await fetch(`/api/seller/products/${productId}/inventory`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inventoryIds: Array.from(selectedItems) }),
        });

        if (res.ok) {
          const data = await res.json();
          toast.success('Đã xóa', `Đã xóa ${data.deleted} tài khoản khỏi kho`);
          setSelectedItems(new Set());
          fetchInventory();
          setDeleteDialog({ isOpen: false, type: null, inventoryId: null });
        } else {
          toast.error('Lỗi', 'Không thể xóa các tài khoản đã chọn');
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Lỗi', 'Không thể xóa. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    const newSet = new Set(visiblePasswords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisiblePasswords(newSet);
  };

  const toggleSelectItem = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === inventory.filter(i => i.status !== 'SOLD').length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventory.filter(i => i.status !== 'SOLD').map(i => i.id)));
    }
  };

  const maskAccountData = (data: string, visible: boolean) => {
    if (visible) return data;
    const parts = data.split('|');
    return parts.map((part, idx) => {
      if (idx === 0) return part; // Show first part (usually username/email)
      return '••••••';
    }).join('|');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sẵn sàng</span>;
      case 'RESERVED':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Đang giữ</span>;
      case 'SOLD':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"><Package className="w-3 h-3" /> Đã bán</span>;
      case 'DISABLED':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Vô hiệu</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (searchTerm) {
      return item.accountData.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  if (!product && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Không tìm thấy sản phẩm</p>
        <Link href="/seller/products">
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý kho hàng</h1>
            {product && <p className="text-gray-500">{product.title}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm 1
          </Button>
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload hàng loạt
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sẵn sàng</p>
              <p className="text-2xl font-bold text-green-600">{stats.AVAILABLE}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang giữ</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.RESERVED}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đã bán</p>
              <p className="text-2xl font-bold text-blue-600">{stats.SOLD}</p>
            </div>
            <Package className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vô hiệu</p>
              <p className="text-2xl font-bold text-red-600">{stats.DISABLED}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-200" />
          </div>
        </div>
      </div>

      {/* Variant Stats - Show if product has variants */}
      {hasVariants && variants.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Kho theo phân loại</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {variantStats.map((vs) => (
              <div 
                key={vs.variantId} 
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  variantFilter === vs.variantId 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setVariantFilter(variantFilter === vs.variantId ? '' : vs.variantId)}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{vs.variantName}</p>
                <p className="text-lg font-bold text-indigo-600">{vs.availableCount} <span className="text-xs font-normal text-gray-500">sẵn sàng</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="AVAILABLE">Sẵn sàng</option>
              <option value="RESERVED">Đang giữ</option>
              <option value="SOLD">Đã bán</option>
              <option value="DISABLED">Vô hiệu</option>
            </select>
            {hasVariants && variants.length > 0 && (
              <select
                value={variantFilter}
                onChange={(e) => setVariantFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Tất cả phân loại</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
            <Button variant="outline" size="sm" onClick={fetchInventory}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Đã chọn {selectedItems.size}</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
                <Trash2 className="w-4 h-4 mr-1" />
                Xóa
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có tài khoản trong kho</p>
            <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload ngay
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === inventory.filter(i => i.status !== 'SOLD').length && inventory.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dữ liệu tài khoản</th>
                {hasVariants && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Phân loại</th>}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ngày tạo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Người mua</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {item.status !== 'SOLD' && (
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded max-w-md truncate">
                        {maskAccountData(item.accountData, visiblePasswords.has(item.id))}
                      </code>
                      <button
                        onClick={() => togglePasswordVisibility(item.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {visiblePasswords.has(item.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  {hasVariants && (
                    <td className="px-4 py-3">
                      {item.variant ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                          {item.variant.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.soldTo ? (
                      <span className="text-blue-600">{item.soldTo.name || item.soldTo.email}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status !== 'SOLD' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setEditAccountData(item.accountData);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteItemClick(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Upload kho hàng</h2>
              <p className="text-sm text-gray-500 mt-1">Mỗi dòng là một tài khoản. Định dạng: username|password|... </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Variant Selection for products with variants */}
              {hasVariants && variants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn phân loại sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={uploadVariantId}
                    onChange={(e) => setUploadVariantId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Chọn phân loại --</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Kho: {variantStats.find(vs => vs.variantId === v.id)?.availableCount || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder={`Ví dụ:\nuser1@gmail.com|password123\nuser2@gmail.com|password456\n...`}
                className="w-full h-56 px-3 py-2 border rounded-lg font-mono text-sm resize-none"
              />
              <p className="text-sm text-gray-500">
                {uploadText.split('\n').filter(l => l.trim()).length} dòng
              </p>

              {uploadResult && (
                <div className={`p-4 rounded-lg ${uploadResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  {uploadResult.error ? (
                    <p className="text-red-600">{uploadResult.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium text-green-800">
                        Kết quả: {uploadResult.success} thành công / {uploadResult.totalLines} dòng
                      </p>
                      {uploadResult.duplicates > 0 && (
                        <p className="text-yellow-700">⚠️ {uploadResult.duplicates} trùng lặp</p>
                      )}
                      {uploadResult.blacklisted > 0 && (
                        <p className="text-red-700">🚫 {uploadResult.blacklisted} trong blacklist</p>
                      )}
                      {uploadResult.errors > 0 && (
                        <p className="text-red-700">❌ {uploadResult.errors} lỗi</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowUploadModal(false);
                setUploadText('');
                setUploadVariantId('');
                setUploadResult(null);
              }}>
                Đóng
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || !uploadText.trim() || (hasVariants && variants.length > 0 && !uploadVariantId)}
              >
                {isUploading ? 'Đang upload...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Thêm tài khoản</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Variant Selection for products with variants */}
              {hasVariants && variants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn phân loại sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={singleVariantId}
                    onChange={(e) => setSingleVariantId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Chọn phân loại --</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Kho: {variantStats.find(vs => vs.variantId === v.id)?.availableCount || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dữ liệu tài khoản
                </label>
                <Input
                  value={singleAccountData}
                  onChange={(e) => setSingleAccountData(e.target.value)}
                  placeholder="username|password|..."
                  className="font-mono"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddModal(false);
                setSingleAccountData('');
                setSingleVariantId('');
              }}>
                Hủy
              </Button>
              <Button 
                onClick={handleAddSingle} 
                disabled={!singleAccountData.trim() || (hasVariants && variants.length > 0 && !singleVariantId)}
              >
                Thêm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Chỉnh sửa tài khoản</h2>
            </div>
            <div className="p-6">
              <Input
                value={editAccountData}
                onChange={(e) => setEditAccountData(e.target.value)}
                placeholder="username|password|..."
                className="font-mono"
              />
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Hủy
              </Button>
              <Button onClick={handleUpdateItem} disabled={!editAccountData.trim()}>
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, type: null, inventoryId: null })}
        onConfirm={handleDeleteConfirm}
        title={deleteDialog.type === 'bulk' ? 'Xóa nhiều tài khoản' : 'Xóa tài khoản'}
        description={
          deleteDialog.type === 'bulk'
            ? `Bạn có chắc muốn xóa ${selectedItems.size} tài khoản đã chọn? Hành động này không thể hoàn tác.`
            : 'Bạn có chắc muốn xóa tài khoản này? Hành động này không thể hoàn tác.'
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
        icon={<Trash2 className="w-7 h-7" />}
      />
    </div>
  );
}
