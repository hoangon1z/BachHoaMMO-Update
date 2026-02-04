'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Camera, Save, Upload, Loader2, ImageIcon, Star, ShoppingBag, Clock, AlertTriangle, Bell, Send, CheckCircle, Link2, Unlink, ExternalLink, Key, Copy, Eye, EyeOff, Trash2, RefreshCw, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { VerifyBadge } from '@/components/VerifyBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const getFullImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

interface StoreData {
  id?: string;
  shopName: string;
  shopDescription: string;
  shopLogo: string;
  rating?: number;
  totalSales?: number;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt?: string;
}

export default function SellerSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [hasStore, setHasStore] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<StoreData>({
    shopName: '',
    shopDescription: '',
    shopLogo: '',
  });

  // API Key states
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ apiKey: string; secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram states
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLinkedAt, setTelegramLinkedAt] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

  useEffect(() => {
    fetchStore();
    fetchTelegramStatus();
    fetchApiKeys();
  }, []);

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setIsLoadingApiKeys(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  // Generate new API key
  const generateApiKey = async () => {
    try {
      setIsGeneratingKey(true);
      setApiKeyMessage(null);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newApiKeyName || 'Default API Key' }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey({ apiKey: data.apiKey, secret: data.secret });
        setNewApiKeyName('');
        fetchApiKeys();
        setApiKeyMessage({ type: 'success', text: 'Tạo API key thành công! Lưu secret ngay vì nó chỉ hiển thị một lần.' });
      } else {
        const error = await response.json();
        setApiKeyMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      setApiKeyMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Bạn có chắc muốn xóa API key này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/seller/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        fetchApiKeys();
        setApiKeyMessage({ type: 'success', text: 'Đã xóa API key' });
      } else {
        setApiKeyMessage({ type: 'error', text: 'Không thể xóa API key' });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  // Toggle API key status
  const toggleApiKeyStatus = async (keyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/seller/api-keys/${keyId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setApiKeyMessage({ type: 'success', text: `Đã copy ${label}` });
    setTimeout(() => setApiKeyMessage(null), 2000);
  };

  const fetchStore = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/seller/store`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          id: data.id,
          shopName: data.shopName || '',
          shopDescription: data.shopDescription || '',
          shopLogo: data.shopLogo || '',
          rating: data.rating,
          totalSales: data.totalSales,
          reviewCount: data.reviewCount,
          isVerified: data.isVerified,
          createdAt: data.createdAt,
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

  // Fetch Telegram connection status
  const fetchTelegramStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/telegram/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTelegramConnected(data.connected);
        setTelegramLinkedAt(data.linkedAt);
      }
    } catch (error) {
      console.error('Error fetching Telegram status:', error);
    }
  };

  // Get Telegram link
  const getTelegramLink = async () => {
    setIsLoadingTelegram(true);
    setTelegramMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/telegram/link', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTelegramLink(data.link);
      } else {
        setTelegramMessage({ type: 'error', text: 'Không thể lấy link kết nối' });
      }
    } catch (error) {
      console.error('Error getting Telegram link:', error);
      setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsLoadingTelegram(false);
    }
  };

  // Unlink Telegram
  const unlinkTelegramClick = () => {
    setShowUnlinkDialog(true);
  };

  const unlinkTelegramConfirm = async () => {
    setIsLoadingTelegram(true);
    setTelegramMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/telegram/unlink', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setTelegramConnected(false);
        setTelegramLinkedAt(null);
        setTelegramLink(null);
        setTelegramMessage({ type: 'success', text: 'Đã hủy kết nối Telegram' });
        setShowUnlinkDialog(false);
      } else {
        setTelegramMessage({ type: 'error', text: 'Không thể hủy kết nối' });
      }
    } catch (error) {
      console.error('Error unlinking Telegram:', error);
      setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsLoadingTelegram(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    setIsSendingTest(true);
    setTelegramMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTelegramMessage({ type: 'success', text: 'Đã gửi thông báo test! Kiểm tra Telegram của bạn.' });
      } else {
        setTelegramMessage({ type: 'error', text: data.message || 'Không thể gửi thông báo' });
      }
    } catch (error) {
      console.error('Error sending test:', error);
      setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSendingTest(false);
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data }));
        setHasStore(true);
        setMessage({ type: 'success', text: hasStore ? 'Cap nhat cua hang thanh cong!' : 'Tao cua hang thanh cong!' });
        
        if (!hasStore) {
          setTimeout(() => {
            router.push('/seller');
          }, 1500);
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Co loi xay ra' });
      }
    } catch (error) {
      console.error('Error saving store:', error);
      setMessage({ type: 'error', text: 'Co loi xay ra, vui long thu lai' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)' });
      return;
    }

    // Validate file size (5MB max - backend/server limit)
    const maxSize = 5 * 1024 * 1024; // 5MB for all file types
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setMessage({ 
        type: 'error', 
        text: `File quá lớn (${fileSizeMB}MB). Vui lòng chọn file nhỏ hơn 5MB${file.type === 'image/gif' ? '. Tip: Nén GIF tại ezgif.com' : ''}` 
      });
      return;
    }

    setIsUploadingLogo(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('logo', file);

      const response = await fetch('/api/seller/store/logo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, shopLogo: data.shopLogo }));
        setMessage({ type: 'success', text: 'Cap nhat logo thanh cong!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json().catch(() => ({ message: 'Co loi xay ra khi tai anh len' }));
        setMessage({ type: 'error', text: error.message || 'Co loi xay ra khi tai anh len' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: 'Co loi xay ra, vui long thu lai' });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {hasStore ? 'Cài đặt cửa hàng' : 'Tạo cửa hàng'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {hasStore ? 'Quản lý thông tin cửa hàng của bạn' : 'Tạo cửa hàng để bắt đầu bán hàng'}
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Store Overview Card */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-5">
                {/* Logo */}
                <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.shopLogo ? (
                    <img src={getFullImageUrl(formData.shopLogo)} alt={formData.shopName} className="w-full h-full object-cover" />
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt={formData.shopName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-semibold text-gray-900 truncate">{formData.shopName}</h2>
                    {formData.isVerified && (
                      <VerifyBadge size={20} />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">ID: {formData.id?.slice(0, 8)}...</p>
                  
                  {formData.shopDescription && (
                    <p className="text-sm text-gray-600 line-clamp-2">{formData.shopDescription}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Đánh giá</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formData.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-gray-500">({formData.reviewCount || 0} đánh giá)</p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Đã bán</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formData.totalSales || 0}</p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Tham gia</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(formData.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Thông tin cửa hàng</h3>
            <p className="text-sm text-gray-500 mt-0.5">Cập nhật thông tin cơ bản của cửa hàng</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Logo Upload */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Logo cửa hàng</Label>
              <div className="flex items-start gap-5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {isUploadingLogo ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : formData.shopLogo ? (
                      <img src={getFullImageUrl(formData.shopLogo)} alt="Logo" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    title="Chọn logo cửa hàng (JPG, PNG, GIF, WEBP)"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white border border-gray-300 hover:border-gray-400 text-gray-600 rounded-full flex items-center justify-center shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-600 mb-3">
                    Tải lên logo cho cửa hàng. Khuyến nghị ảnh vuông, kích thước tối thiểu 200x200px.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="h-9"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Dang tai len...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Tai anh len
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-400 mt-2">JPG, PNG, GIF (động), WEBP - Tối đa 5MB. GIF lớn có thể nén tại <a href="https://ezgif.com/optimize" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ezgif.com</a></p>
                </div>
              </div>
            </div>

            {/* Shop Name */}
            <div>
              <Label htmlFor="shopName" className="text-sm font-medium text-gray-700 mb-2 block">
                Tên cửa hàng <span className="text-red-500">*</span>
              </Label>
              <Input
                id="shopName"
                placeholder="VD: Shop Digital ABC"
                value={formData.shopName}
                onChange={(e) => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
                required
                className="h-11"
              />
            </div>

            {/* Shop Description */}
            <div>
              <Label htmlFor="shopDescription" className="text-sm font-medium text-gray-700 mb-2 block">
                Mô tả cửa hàng
              </Label>
              <textarea
                id="shopDescription"
                placeholder="Giới thiệu ngắn về shop của bạn"
                value={formData.shopDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, shopDescription: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">{formData.shopDescription.length}/500 ky tu</p>
            </div>
          </div>

          {/* Form Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="h-10"
            >
              Huy
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="h-10 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Dang luu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {hasStore ? 'Luu thay doi' : 'Tao cua hang'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Telegram Integration */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Thông báo Telegram</h3>
                  <p className="text-sm text-gray-500">Nhận thông báo đơn hàng, tin nhắn qua Telegram</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {telegramConnected ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className={`font-medium ${telegramConnected ? 'text-green-700' : 'text-gray-700'}`}>
                      {telegramConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                    </p>
                    {telegramLinkedAt && (
                      <p className="text-xs text-gray-500">
                        Kết nối lúc: {new Date(telegramLinkedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                </div>
                
                {telegramConnected ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={sendTestNotification}
                      disabled={isSendingTest}
                      className="gap-2"
                    >
                      {isSendingTest ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      Test
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={unlinkTelegramClick}
                      disabled={isLoadingTelegram}
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Unlink className="w-4 h-4" />
                      Hủy kết nối
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={getTelegramLink}
                    disabled={isLoadingTelegram}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoadingTelegram ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    Kết nối Telegram
                  </Button>
                )}
              </div>

              {/* Telegram Link */}
              {telegramLink && !telegramConnected && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <Send className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 mb-2">Bước tiếp theo:</p>
                      <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Nhấn vào nút bên dưới để mở Telegram</li>
                        <li>Nhấn <strong>Start</strong> trong Telegram</li>
                        <li>Quay lại trang này và làm mới để kiểm tra</li>
                      </ol>
                    </div>
                  </div>
                  
                  <a
                    href={telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Mở Telegram
                  </a>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      fetchTelegramStatus();
                      setTelegramMessage({ type: 'success', text: 'Đang kiểm tra...' });
                      setTimeout(() => setTelegramMessage(null), 2000);
                    }}
                  >
                    Kiểm tra kết nối
                  </Button>
                </div>
              )}

              {/* Message */}
              {telegramMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  telegramMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {telegramMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <p className="text-sm">{telegramMessage.text}</p>
                </div>
              )}

              {/* Info */}
              <div className="text-sm text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Bạn sẽ nhận thông báo khi:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Có đơn hàng mới</li>
                  <li>Có tin nhắn từ khách hàng</li>
                  <li>Có khiếu nại cần xử lý</li>
                  <li>Yêu cầu rút tiền được duyệt/từ chối</li>
                  <li>Thông báo từ Admin</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* API Integration Section */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">API Integration</h3>
                  <p className="text-sm text-gray-500">Kết nối API để tự động quản lý kho hàng</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* API Documentation Link */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-purple-800 mb-1">Tài liệu API</p>
                    <p className="text-sm text-purple-700 mb-3">
                      Sử dụng API để tự động thêm hàng vào kho, quản lý sản phẩm, xem đơn hàng từ hệ thống của bạn.
                    </p>
                    <a
                      href="https://documenter.getpostman.com/view/27876203/2sBXc7MQTs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xem tài liệu API
                    </a>
                  </div>
                </div>
              </div>

              {/* Generate New API Key */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Tạo API Key mới</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tên API Key (VD: Production, Testing...)"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={generateApiKey}
                    disabled={isGeneratingKey}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Tạo Key
                  </Button>
                </div>
              </div>

              {/* Newly Created Key (show once) */}
              {newlyCreatedKey && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    Đã tạo API Key! Lưu thông tin ngay.
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-20">API Key:</span>
                      <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                        {newlyCreatedKey.apiKey}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(newlyCreatedKey.apiKey, 'API Key')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-20">Secret:</span>
                      <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                        {showSecret ? newlyCreatedKey.secret : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(newlyCreatedKey.secret, 'Secret')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    ⚠️ Secret chỉ hiển thị MỘT LẦN DUY NHẤT! Hãy lưu lại ngay.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewlyCreatedKey(null)}
                  >
                    Đã lưu, đóng thông báo
                  </Button>
                </div>
              )}

              {/* API Key List */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">API Keys của bạn</Label>
                {isLoadingApiKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Key className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Chưa có API Key nào</p>
                    <p className="text-sm">Tạo API Key để bắt đầu sử dụng API</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className={`p-4 border rounded-xl ${key.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{key.name}</span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                key.isActive 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {key.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <code className="text-sm text-gray-600 font-mono">{key.apiKey}</code>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Calls: {key.totalCalls?.toLocaleString() || 0}</span>
                              <span>Rate: {key.rateLimit}/phút</span>
                              {key.lastUsedAt && (
                                <span>Last: {new Date(key.lastUsedAt).toLocaleString('vi-VN')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleApiKeyStatus(key.id)}
                              title={key.isActive ? 'Tắt' : 'Bật'}
                            >
                              {key.isActive ? 'Tắt' : 'Bật'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => revokeApiKey(key.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Key Message */}
              {apiKeyMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  apiKeyMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {apiKeyMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <p className="text-sm">{apiKeyMessage.text}</p>
                </div>
              )}

              {/* Info */}
              <div className="text-sm text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">API cho phép bạn:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Tự động thêm hàng vào kho từ hệ thống của bạn</li>
                  <li>Quản lý sản phẩm (tạo, sửa, xóa)</li>
                  <li>Xem và xử lý đơn hàng</li>
                  <li>Giao hàng tự động hoặc thủ công</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-semibold text-gray-900">Vùng nguy hiểm</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Một khi đóng cửa hàng, bạn sẽ không thể bán hàng nữa. Dữ liệu sản phẩm và đơn hàng vẫn được giữ lại.
              </p>
              <Button 
                type="button"
                variant="outline" 
                className="h-10 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                Đóng cửa hàng
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Unlink Telegram Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showUnlinkDialog}
        onClose={() => setShowUnlinkDialog(false)}
        onConfirm={unlinkTelegramConfirm}
        title="Hủy kết nối Telegram"
        description="Bạn có chắc muốn hủy kết nối Telegram? Bạn sẽ không nhận được thông báo nữa."
        confirmText="Hủy kết nối"
        cancelText="Đóng"
        variant="warning"
        isLoading={isLoadingTelegram}
        icon={<Unlink className="w-7 h-7" />}
      />
    </div>
  );
}
