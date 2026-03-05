'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Package,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/config';
import { useToast } from '@/components/Toast';

interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  usageLimitPerUser: number;
  description?: string;
  expiresAt?: string;
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  productIds?: string; // JSON array
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  slug?: string;
}

interface CreateDiscountCodeData {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  maxDiscount?: number;
  minOrderValue?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  description?: string;
  expiresAt?: string;
  productIds?: string; // JSON array string
}

export default function DiscountCodesPage() {
  const toast = useToast();
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Products for selection
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [previewAmount, setPreviewAmount] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDiscountCodeData>({
    code: '',
    type: 'PERCENT',
    value: 0,
    usageLimitPerUser: 1,
  });

  useEffect(() => {
    fetchDiscountCodes();
    fetchSellerProducts();
  }, []);

  // Realtime preview: tính tiền giảm dựa trên minOrderValue
  useEffect(() => {
    const base = formData.minOrderValue || 100000;
    if (!formData.value || formData.value <= 0) { setPreviewAmount(null); return; }
    if (formData.type === 'PERCENT') {
      let discount = (base * formData.value) / 100;
      if (formData.maxDiscount && discount > formData.maxDiscount) discount = formData.maxDiscount;
      setPreviewAmount(discount);
    } else {
      setPreviewAmount(Math.min(formData.value, base));
    }
  }, [formData.value, formData.type, formData.maxDiscount, formData.minOrderValue]);

  const fetchSellerProducts = async () => {
    try {
      const response = await authFetch('/seller/products?limit=100&page=1');
      if (!response.ok) return;
      const data = await response.json();
      // Handle various response formats from seller products API
      // seller/products API returns { products: [...], total, page, limit }
      // Each product has field "title" (not "name")
      const rawProducts = Array.isArray(data) ? data : (data.products || data.data || []);
      setSellerProducts(
        rawProducts.map((p: any) => ({
          id: p.id,
          name: p.title || p.name || '(Không có tên)',
          price: Number(p.price) || 0,
          slug: p.slug,
        }))
      );
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchDiscountCodes = async () => {
    try {
      setIsLoading(true);
      const response = await authFetch('/discount-codes/my');

      if (!response.ok) {
        throw new Error('Failed to fetch discount codes');
      }

      const data = await response.json();
      setDiscountCodes(data.data || data || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Lỗi', 'Không thể tải danh sách mã giảm giá');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Lỗi', 'Mã giảm giá không được để trống');
      return;
    }

    if (formData.value <= 0) {
      toast.error('Lỗi', 'Giá trị phải lớn hơn 0');
      return;
    }

    if (formData.type === 'PERCENT' && formData.value > 100) {
      toast.error('Lỗi', 'Phần trăm không thể vượt quá 100%');
      return;
    }

    if (!applyToAll && selectedProductIds.length === 0) {
      toast.error('Lỗi', 'Vui lòng chọn ít nhất 1 sản phẩm hoặc chọn toàn bộ gian hàng');
      return;
    }

    try {
      setIsSubmitting(true);
      const submitData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        usageLimitPerUser: formData.usageLimitPerUser || 1,
        productIds: (!applyToAll && selectedProductIds.length > 0)
          ? JSON.stringify(selectedProductIds)
          : undefined,
      };

      const response = await authFetch('/discount-codes', {
        method: 'POST',
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create discount code');
      }

      toast.success('Thành công', 'Mã giảm giá đã được tạo');
      setIsDialogOpen(false);
      resetForm();
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error creating discount code:', error);
      toast.error('Lỗi', error instanceof Error ? error.message : 'Không thể tạo mã giảm giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await authFetch(`/discount-codes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update discount code');
      }

      toast.success('Thành công', `Mã giảm giá đã được ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'}`);
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error updating discount code:', error);
      toast.error('Lỗi', 'Không thể cập nhật mã giảm giá');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await authFetch(`/discount-codes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete discount code');
      }

      toast.success('Thành công', 'Mã giảm giá đã được xóa');
      setDeleteConfirm(null);
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Lỗi', 'Không thể xóa mã giảm giá');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Thành công', `Đã sao chép mã "${code}"`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Error copying code:', error);
      toast.error('Lỗi', 'Không thể sao chép mã');
    }
  };

  const resetForm = () => {
    setFormData({ code: '', type: 'PERCENT', value: 0, usageLimitPerUser: 1 });
    setSelectedProductIds([]);
    setApplyToAll(true);
    setPreviewAmount(null);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const getDiscountDisplay = (code: DiscountCode) => {
    if (code.type === 'PERCENT') {
      return `${code.value}%`;
    }
    return `${code.value.toLocaleString('vi-VN')}đ`;
  };

  const getStatusBadge = (code: DiscountCode) => {
    const now = new Date();
    const isExpired = code.expiresAt && new Date(code.expiresAt) < now;

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <Clock className="w-3 h-3" />
          Hết hạn
        </span>
      );
    }

    if (!code.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          <XCircle className="w-3 h-3" />
          Tắt
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" />
        Hoạt động
      </span>
    );
  };

  const getUsageDisplay = (code: DiscountCode) => {
    if (code.usageLimit) {
      return `${code.usedCount}/${code.usageLimit}`;
    }
    return `${code.usedCount}`;
  };

  const getExpiryDisplay = (expiresAt?: string) => {
    if (!expiresAt) {
      return 'Không có hạn';
    }
    const date = new Date(expiresAt);
    return date.toLocaleDateString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải mã giảm giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mã giảm giá</h1>
                <p className="text-sm text-gray-600">Quản lý mã giảm giá của bạn</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo mã giảm giá
              </Button>

              {/* Create Dialog */}
              <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Tạo mã giảm giá mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleCreateSubmit} className="space-y-4 overflow-y-auto flex-1 px-1 pb-2">
                  {/* Code Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="VD: SUMMER2024"
                      maxLength={50}
                      required
                    />
                  </div>

                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Loại <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value="PERCENT"
                          checked={formData.type === 'PERCENT'}
                          onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value as 'PERCENT' | 'FIXED' })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Phần trăm (%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value="FIXED"
                          checked={formData.type === 'FIXED'}
                          onChange={(e) =>
                            setFormData({ ...formData, type: e.target.value as 'PERCENT' | 'FIXED' })
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">Cố định (đ)</span>
                      </label>
                    </div>
                  </div>

                  {/* Value Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá trị <span className="text-red-500">*</span>
                      {formData.type === 'PERCENT' ? ' (%)' : ' (đ)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          value: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder={formData.type === 'PERCENT' ? '10' : '50000'}
                      step={formData.type === 'PERCENT' ? 0.1 : 1}
                      min="0"
                      required
                    />
                  </div>

                  {/* Max Discount (for PERCENT) */}
                  {formData.type === 'PERCENT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giảm tối đa (đ) <span className="text-orange-500 font-normal">— Khuyến nghị điền</span>
                      </label>
                      <Input
                        type="number"
                        value={formData.maxDiscount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="VD: 30000 (giảm tối đa 30k)"
                        min="0"
                      />
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Nếu không điền, khách đơn lớn sẽ được giảm không giới hạn! VD: 30% đơn 500k = giảm 150k
                      </p>
                    </div>
                  )}

                  {/* Realtime Preview */}
                  {previewAmount !== null && formData.value > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold">Xem trước mức giảm:</p>
                        <p>Đơn <strong>{(formData.minOrderValue || 100000).toLocaleString('vi-VN')}đ</strong> → giảm <strong className="text-green-700">{previewAmount.toLocaleString('vi-VN')}đ</strong></p>
                        {formData.type === 'PERCENT' && !formData.maxDiscount && (
                          <p className="text-orange-600 font-medium mt-1">⚠️ Đơn 500k sẽ giảm {((500000 * formData.value) / 100).toLocaleString('vi-VN')}đ — hãy đặt giới hạn tối đa!</p>
                        )}
                        {formData.type === 'PERCENT' && formData.maxDiscount && (
                          <p className="text-green-700 mt-1">✓ Đơn dù lớn đến đâu cũng chỉ giảm tối đa {formData.maxDiscount.toLocaleString('vi-VN')}đ</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Min Order Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Đơn hàng tối thiểu (đ)
                    </label>
                    <Input
                      type="number"
                      value={formData.minOrderValue || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minOrderValue: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="50000"
                      min="0"
                    />
                  </div>

                  {/* Usage Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tổng lượt dùng
                    </label>
                    <Input
                      type="number"
                      value={formData.usageLimit || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usageLimit: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="Không giới hạn"
                      min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Để trống nếu không giới hạn
                    </p>
                  </div>

                  {/* Usage Limit Per User */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mỗi user tối đa (lần)
                    </label>
                    <Input
                      type="number"
                      value={formData.usageLimitPerUser}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usageLimitPerUser: parseFloat(e.target.value) || 1,
                        })
                      }
                      placeholder="1"
                      min="1"
                    />
                  </div>

                  {/* Apply to specific products */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Package className="w-4 h-4" />
                      Áp dụng cho
                    </div>
                    <div className="flex gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={applyToAll} onChange={() => setApplyToAll(true)} className="w-4 h-4" />
                        <span className="text-sm text-gray-700">Toàn bộ gian hàng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!applyToAll} onChange={() => setApplyToAll(false)} className="w-4 h-4" />
                        <span className="text-sm text-gray-700">Sản phẩm cụ thể</span>
                      </label>
                    </div>
                    {!applyToAll && (
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        {sellerProducts.length === 0 ? (
                          <p className="text-sm text-gray-500 p-3">Không có sản phẩm nào</p>
                        ) : (
                          sellerProducts.map((product) => (
                            <label key={product.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-4 h-4 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.price.toLocaleString('vi-VN')}đ</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                    {!applyToAll && selectedProductIds.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Chọn ít nhất 1 sản phẩm hoặc chọn toàn bộ gian hàng</p>
                    )}
                    {!applyToAll && selectedProductIds.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">✓ Đã chọn {selectedProductIds.length} sản phẩm</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mục đích
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value || undefined,
                        })
                      }
                      placeholder="VD: Bồi thường khách hàng, khuyến mãi tháng 5..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày hết hạn
                    </label>
                    <Input
                      type="date"
                      value={formData.expiresAt ? formData.expiresAt.split('T')[0] : ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                    />
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      disabled={isSubmitting}
                    >
                      Hủy
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Đang tạo...' : 'Tạo mã'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {discountCodes.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Tag className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có mã giảm giá</h3>
            <p className="text-gray-600 mb-6">
              Tạo mã giảm giá đầu tiên để quản lý và khuyến khích khách hàng của bạn
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Tạo mã giảm giá
            </Button>
          </div>
        ) : (
          // Table View
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mã
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Giá trị
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Đã dùng/Giới hạn
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Áp dụng
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hết hạn
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {discountCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-semibold text-gray-900">
                            {code.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title="Sao chép mã"
                          >
                            {copiedCode === code.code ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {code.type === 'PERCENT' ? 'Phần trăm' : 'Cố định'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {getDiscountDisplay(code)}
                        {code.type === 'PERCENT' && code.maxDiscount && (
                          <div className="text-xs text-gray-600 font-normal">
                            tối đa {code.maxDiscount.toLocaleString('vi-VN')}đ
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getUsageDisplay(code)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {code.productIds ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                            <Package className="w-3 h-3" />
                            {(() => { try { return JSON.parse(code.productIds).length + ' SP'; } catch { return 'SP cụ thể'; } })()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Toàn gian hàng</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getExpiryDisplay(code.expiresAt)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(code)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(code.id, code.isActive)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                            title={code.isActive ? 'Tắt' : 'Bật'}
                          >
                            {code.isActive ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </button>

                          {deleteConfirm === code.id ? (
                            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                              <button
                                onClick={() => handleDelete(code.id)}
                                className="text-red-600 hover:text-red-700 text-xs font-medium"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-gray-600 hover:text-gray-700 text-xs font-medium"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(code.id)}
                              className="p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
