'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Camera, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StoreData {
  id?: string;
  shopName: string;
  shopDescription: string;
  shopLogo: string;
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
}

export default function SellerSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStore, setHasStore] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<StoreData>({
    shopName: '',
    shopDescription: '',
    shopLogo: '',
  });

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/store`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFormData({
          id: data.id,
          shopName: data.shopName || '',
          shopDescription: data.shopDescription || '',
          shopLogo: data.shopLogo || '',
          rating: data.rating,
          totalSales: data.totalSales,
          isVerified: data.isVerified,
        });
        setHasStore(true);
      } else if (response.status === 404) {
        setHasStore(false);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.shopName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên cửa hàng' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const url = `/api/seller/store`;
      const method = hasStore ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: formData.shopName,
          shopDescription: formData.shopDescription,
          shopLogo: formData.shopLogo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data }));
        setHasStore(true);
        setMessage({ type: 'success', text: hasStore ? 'Cập nhật cửa hàng thành công!' : 'Tạo cửa hàng thành công!' });
        
        // Refresh auth to get updated user data
        if (!hasStore) {
          setTimeout(() => {
            router.push('/seller');
          }, 1500);
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error saving store:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {hasStore ? 'Cài đặt cửa hàng' : 'Tạo cửa hàng'}
          </h1>
          <p className="text-gray-600">
            {hasStore ? 'Quản lý thông tin cửa hàng của bạn' : 'Tạo cửa hàng để bắt đầu bán hàng'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Store Stats (if exists) */}
        {hasStore && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                {formData.shopLogo ? (
                  <img src={formData.shopLogo} alt={formData.shopName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Store className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{formData.shopName}</h2>
                  {formData.isVerified && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-gray-500">ID: {formData.id?.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Đánh giá</p>
                <p className="text-xl font-bold text-gray-900">{formData.rating?.toFixed(1) || '0.0'} sao</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Tổng đã bán</p>
                <p className="text-xl font-bold text-gray-900">{formData.totalSales || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <h3 className="font-semibold text-gray-900">Thông tin cửa hàng</h3>

          {/* Shop Logo */}
          <div className="space-y-2">
            <Label>Logo cửa hàng</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                {formData.shopLogo ? (
                  <img src={formData.shopLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Nhập URL hình ảnh logo"
                  value={formData.shopLogo}
                  onChange={(e) => setFormData(prev => ({ ...prev, shopLogo: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Khuyến nghị: Ảnh vuông, kích thước 200x200px</p>
              </div>
            </div>
          </div>

          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shopName">Tên cửa hàng *</Label>
            <Input
              id="shopName"
              placeholder="VD: Shop Digital ABC"
              value={formData.shopName}
              onChange={(e) => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
              required
            />
          </div>

          {/* Shop Description */}
          <div className="space-y-2">
            <Label htmlFor="shopDescription">Mô tả cửa hàng</Label>
            <textarea
              id="shopDescription"
              placeholder="Giới thiệu ngắn về cửa hàng của bạn..."
              value={formData.shopDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, shopDescription: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {hasStore ? 'Lưu thay đổi' : 'Tạo cửa hàng'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Danger Zone */}
        {hasStore && (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h3 className="font-semibold text-red-600 mb-2">Vùng nguy hiểm</h3>
            <p className="text-sm text-gray-600 mb-4">
              Một khi đóng cửa hàng, bạn sẽ không thể bán hàng nữa. Dữ liệu sản phẩm và đơn hàng vẫn được giữ lại.
            </p>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              Đóng cửa hàng
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
