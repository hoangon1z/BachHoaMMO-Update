'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  accountData: string;
  status: string;
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
}

export default function InventoryPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { user } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ AVAILABLE: 0, RESERVED: 0, SOLD: 0, DISABLED: 0 });
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Add single modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [singleAccountData, setSingleAccountData] = useState('');

  // Edit modal
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editAccountData, setEditAccountData] = useState('');

  // View password
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  // Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchProduct();
      fetchInventory();
    }
  }, [user, productId, statusFilter]);

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

      const res = await fetch(urlPath, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory);
        setStats(data.stats);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadText.trim()) return;

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
        body: JSON.stringify({ accountData: uploadText }),
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

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/products/${productId}/inventory`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountData: singleAccountData }),
      });

      if (res.ok) {
        fetchInventory();
        setSingleAccountData('');
        setShowAddModal(false);
        alert('Thêm tài khoản thành công!');
      } else {
        const data = await res.json();
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Add failed:', error);
      alert('Có lỗi xảy ra');
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
        alert('Cập nhật thành công!');
      } else {
        const data = await res.json();
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Có lỗi xảy ra');
    }
  };

  const handleDeleteItem = async (inventoryId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/seller/inventory/${inventoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchInventory();
      } else {
        const data = await res.json();
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedItems.size} tài khoản?`)) return;

    try {
      const token = localStorage.getItem('token');
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
        alert(`Đã xóa ${data.deleted} tài khoản`);
        setSelectedItems(new Set());
        fetchInventory();
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
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

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="AVAILABLE">Sẵn sàng</option>
              <option value="RESERVED">Đang giữ</option>
              <option value="SOLD">Đã bán</option>
              <option value="DISABLED">Vô hiệu</option>
            </select>
            <Button variant="outline" size="sm" onClick={fetchInventory}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Đã chọn {selectedItems.size}</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
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
                          onClick={() => handleDeleteItem(item.id)}
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
            <div className="p-6">
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder={`Ví dụ:\nuser1@gmail.com|password123\nuser2@gmail.com|password456\n...`}
                className="w-full h-64 px-3 py-2 border rounded-lg font-mono text-sm resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                {uploadText.split('\n').filter(l => l.trim()).length} dòng
              </p>

              {uploadResult && (
                <div className={`mt-4 p-4 rounded-lg ${uploadResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
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
                setUploadResult(null);
              }}>
                Đóng
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !uploadText.trim()}>
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
            <div className="p-6">
              <Input
                value={singleAccountData}
                onChange={(e) => setSingleAccountData(e.target.value)}
                placeholder="username|password|..."
                className="font-mono"
              />
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowAddModal(false);
                setSingleAccountData('');
              }}>
                Hủy
              </Button>
              <Button onClick={handleAddSingle} disabled={!singleAccountData.trim()}>
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
    </div>
  );
}
