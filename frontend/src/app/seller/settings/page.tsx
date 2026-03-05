'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Camera, Save, Upload, Loader2, ImageIcon, Star, ShoppingBag, Clock, AlertTriangle, Globe, MonitorUp, Phone, Send, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Wifi, WifiOff, Coffee, MessageSquare, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { VerifyBadge } from '@/components/VerifyBadge';

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
  contactPhone?: string;
  contactTelegram?: string;
  storeStatus?: string;
  statusMessage?: string;
  hasWithdrawalPin?: boolean;
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
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSavingLogoUrl, setIsSavingLogoUrl] = useState(false);
  const [formData, setFormData] = useState<StoreData>({
    shopName: '',
    shopDescription: '',
    shopLogo: '',
  });

  // Contact info state
  const [contactPhone, setContactPhone] = useState('');
  const [contactTelegram, setContactTelegram] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Store status state
  const [storeStatus, setStoreStatus] = useState('ONLINE');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusSaveMessage, setStatusSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PIN state
  const [hasPin, setHasPin] = useState(false);
  const [pinMode, setPinMode] = useState<'set' | 'change' | null>(null);
  const [pinData, setPinData] = useState({ pin: '', confirmPin: '', oldPin: '', newPin: '', confirmNewPin: '' });
  const [showPin, setShowPin] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-reply state
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [autoReplyStartHour, setAutoReplyStartHour] = useState(22);
  const [autoReplyEndHour, setAutoReplyEndHour] = useState(8);
  const [autoReplyCooldown, setAutoReplyCooldown] = useState(30);
  const [isSavingAutoReply, setIsSavingAutoReply] = useState(false);
  const [autoReplyMsg, setAutoReplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStore();
  }, []);

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
          contactPhone: data.contactPhone || '',
          contactTelegram: data.contactTelegram || '',
          storeStatus: data.storeStatus || 'ONLINE',
          statusMessage: data.statusMessage || '',
          hasWithdrawalPin: data.hasWithdrawalPin,
        });
        setContactPhone(data.contactPhone || '');
        setContactTelegram(data.contactTelegram || '');
        setStoreStatus(data.storeStatus || 'ONLINE');
        setStatusMessage(data.statusMessage || '');
        setHasPin(data.hasWithdrawalPin || false);
        // Auto-reply settings
        setAutoReplyEnabled(data.autoReplyEnabled || false);
        setAutoReplyMessage(data.autoReplyMessage || '');
        setAutoReplyStartHour(data.autoReplyStartHour ?? 22);
        setAutoReplyEndHour(data.autoReplyEndHour ?? 8);
        setAutoReplyCooldown(data.autoReplyCooldown ?? 30);
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data }));
        setHasStore(true);
        setMessage({ type: 'success', text: hasStore ? 'Cập nhật cửa hàng thành công!' : 'Tạo cửa hàng thành công!' });

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

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    setContactMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/store', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactPhone: contactPhone.trim(),
          contactTelegram: contactTelegram.trim(),
        }),
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, contactPhone: contactPhone.trim(), contactTelegram: contactTelegram.trim() }));
        setContactMessage({ type: 'success', text: 'Cập nhật thông tin liên lạc thành công!' });
        setTimeout(() => setContactMessage(null), 3000);
      } else {
        const error = await response.json();
        setContactMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      setContactMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleSaveStatus = async () => {
    setIsSavingStatus(true);
    setStatusSaveMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/store', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeStatus,
          statusMessage: statusMessage.trim(),
        }),
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, storeStatus, statusMessage: statusMessage.trim() }));
        setStatusSaveMessage({ type: 'success', text: 'Cập nhật trạng thái cửa hàng thành công!' });
        setTimeout(() => setStatusSaveMessage(null), 3000);
      } else {
        const error = await response.json();
        setStatusSaveMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error saving status:', error);
      setStatusSaveMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSaveAutoReply = async () => {
    if (autoReplyEnabled && !autoReplyMessage.trim()) {
      setAutoReplyMsg({ type: 'error', text: 'Vui lòng nhập nội dung tin nhắn tự động' });
      return;
    }

    setIsSavingAutoReply(true);
    setAutoReplyMsg(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/store', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoReplyEnabled,
          autoReplyMessage: autoReplyMessage.trim(),
          autoReplyStartHour,
          autoReplyEndHour,
          autoReplyCooldown,
        }),
      });

      if (response.ok) {
        setAutoReplyMsg({ type: 'success', text: 'Cập nhật tin nhắn tự động thành công!' });
        setTimeout(() => setAutoReplyMsg(null), 3000);
      } else {
        const error = await response.json();
        setAutoReplyMsg({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error saving auto-reply:', error);
      setAutoReplyMsg({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingAutoReply(false);
    }
  };

  const handleSetPin = async () => {
    if (pinData.pin.length !== 6 || !/^\d{6}$/.test(pinData.pin)) {
      setPinMessage({ type: 'error', text: 'Mã PIN phải gồm 6 chữ số' });
      return;
    }
    if (pinData.pin !== pinData.confirmPin) {
      setPinMessage({ type: 'error', text: 'Mã PIN xác nhận không khớp' });
      return;
    }

    setIsSavingPin(true);
    setPinMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/withdrawal-pin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinData.pin }),
      });

      if (response.ok) {
        setHasPin(true);
        setPinMode(null);
        setPinData({ pin: '', confirmPin: '', oldPin: '', newPin: '', confirmNewPin: '' });
        setPinMessage({ type: 'success', text: 'Tạo mã PIN rút tiền thành công!' });
        setTimeout(() => setPinMessage(null), 3000);
      } else {
        const error = await response.json();
        setPinMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      setPinMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleChangePin = async () => {
    if (pinData.newPin.length !== 6 || !/^\d{6}$/.test(pinData.newPin)) {
      setPinMessage({ type: 'error', text: 'Mã PIN mới phải gồm 6 chữ số' });
      return;
    }
    if (pinData.newPin !== pinData.confirmNewPin) {
      setPinMessage({ type: 'error', text: 'Mã PIN mới xác nhận không khớp' });
      return;
    }

    setIsSavingPin(true);
    setPinMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/withdrawal-pin', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPin: pinData.oldPin, newPin: pinData.newPin }),
      });

      if (response.ok) {
        setPinMode(null);
        setPinData({ pin: '', confirmPin: '', oldPin: '', newPin: '', confirmNewPin: '' });
        setPinMessage({ type: 'success', text: 'Đổi mã PIN thành công!' });
        setTimeout(() => setPinMessage(null), 3000);
      } else {
        const error = await response.json();
        setPinMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error changing PIN:', error);
      setPinMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingPin(false);
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

    const maxSize = 5 * 1024 * 1024;
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
        setMessage({ type: 'success', text: 'Cập nhật logo thành công!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra khi tải ảnh lên' }));
        setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi tải ảnh lên' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoUrl = async () => {
    const url = logoUrl.trim();
    if (!url) {
      setMessage({ type: 'error', text: 'Vui lòng nhập URL hình ảnh' });
      return;
    }

    try {
      new URL(url);
    } catch {
      setMessage({ type: 'error', text: 'URL không hợp lệ. Vui lòng nhập đúng định dạng (https://...)' });
      return;
    }

    setIsSavingLogoUrl(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const method = hasStore ? 'PUT' : 'POST';
      const response = await fetch('/api/seller/store', {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName: formData.shopName || 'My Store',
          shopDescription: formData.shopDescription,
          shopLogo: url,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data, shopLogo: url }));
        setHasStore(true);
        setMessage({ type: 'success', text: 'Cập nhật logo thành công!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
        setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi cập nhật logo' });
      }
    } catch (error) {
      console.error('Error saving logo URL:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSavingLogoUrl(false);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return { icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500', label: 'Đang hoạt động' };
      case 'OFFLINE':
        return { icon: WifiOff, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', dotColor: 'bg-red-500', label: 'Tạm đóng' };
      case 'AWAY':
        return { icon: Coffee, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200', dotColor: 'bg-amber-500', label: 'Đang vắng' };
      default:
        return { icon: Wifi, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', dotColor: 'bg-green-500', label: 'Đang hoạt động' };
    }
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
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
            }`}>
            <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Warning: Missing Contact Info */}
        {hasStore && (!formData.contactPhone && !formData.contactTelegram) && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Thiếu thông tin liên lạc!</p>
              <p className="text-sm text-amber-700 mt-1">
                Vui lòng thêm số điện thoại hoặc Telegram để admin có thể liên hệ khi cần thiết (ví dụ: xử lý đơn hàng, khiếu nại, v.v.).
              </p>
            </div>
          </div>
        )}

        {/* Warning: Missing PIN */}
        {hasStore && !hasPin && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Chưa tạo mã PIN rút tiền</p>
              <p className="text-sm text-blue-700 mt-1">
                Bạn cần tạo mã PIN 6 chữ số để bảo mật khi rút tiền. Cuộn xuống phần &quot;Mã PIN rút tiền&quot; để thiết lập.
              </p>
            </div>
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
                      <VerifyBadge size={20} isVerified={formData.isVerified} />
                    )}
                    {/* Status dot */}
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusConfig(formData.storeStatus || 'ONLINE').dotColor}`} />
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

        {/* Contact Information Section */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-900">Thông tin liên lạc</h3>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Để admin có thể liên hệ khi cần xử lý đơn hàng, khiếu nại</p>
            </div>

            <div className="p-6 space-y-4">
              {contactMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${contactMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  {contactMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {contactMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Số điện thoại</Label>
                  <Input
                    placeholder="VD: 0912345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Telegram</Label>
                  <Input
                    placeholder="VD: @username hoặc link t.me/..."
                    value={contactTelegram}
                    onChange={(e) => setContactTelegram(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveContact}
                  disabled={isSavingContact}
                  className="bg-blue-600 hover:bg-blue-700 h-10"
                >
                  {isSavingContact ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Lưu thông tin liên lạc</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Store Status Section */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-500" />
                <h3 className="text-base font-semibold text-gray-900">Trạng thái cửa hàng</h3>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Cho khách hàng biết tình trạng hoạt động của bạn</p>
            </div>

            <div className="p-6 space-y-4">
              {statusSaveMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${statusSaveMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  {statusSaveMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {statusSaveMessage.text}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'ONLINE', label: 'Đang hoạt động', desc: 'Sẵn sàng xử lý đơn', icon: Wifi, color: 'green' },
                  { value: 'AWAY', label: 'Đang vắng', desc: 'Phản hồi chậm hơn', icon: Coffee, color: 'amber' },
                  { value: 'OFFLINE', label: 'Tạm đóng', desc: 'Không nhận đơn mới', icon: WifiOff, color: 'red' },
                ].map((option) => {
                  const isSelected = storeStatus === option.value;
                  const colorMap: Record<string, string> = {
                    green: isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:border-green-300',
                    amber: isSelected ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 hover:border-amber-300',
                    red: isSelected ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 hover:border-red-300',
                  };
                  const dotMap: Record<string, string> = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStoreStatus(option.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${colorMap[option.color]}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotMap[option.color]}`} />
                        <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </button>
                  );
                })}
              </div>

              {storeStatus !== 'ONLINE' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Tin nhắn trạng thái (tùy chọn)</Label>
                  <Input
                    placeholder={storeStatus === 'AWAY' ? 'VD: Đang bận, sẽ trả lời trong 2-3 giờ' : 'VD: Nghỉ Tết, hoạt động lại ngày 10/2'}
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveStatus}
                  disabled={isSavingStatus}
                  className="bg-blue-600 hover:bg-blue-700 h-10"
                >
                  {isSavingStatus ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Lưu trạng thái</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Reply Settings Section */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-semibold text-gray-900">Tin nhắn tự động</h3>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Tự động trả lời khi có khách nhắn tin trong giờ bạn không online</p>
            </div>

            <div className="p-6 space-y-5">
              {autoReplyMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${autoReplyMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  {autoReplyMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {autoReplyMsg.text}
                </div>
              )}

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${autoReplyEnabled ? 'bg-indigo-100' : 'bg-gray-200'}`}>
                    <Bot className={`w-5 h-5 ${autoReplyEnabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {autoReplyEnabled ? 'Tin nhắn tự động đang bật' : 'Tin nhắn tự động đang tắt'}
                    </p>
                    <p className="text-xs text-gray-500">Tự động gửi tin nhắn khi bạn offline và có khách nhắn tin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoReplyEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {autoReplyEnabled && (
                <>
                  {/* Message Content */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Nội dung tin nhắn tự động <span className="text-red-500">*</span></Label>
                    <textarea
                      placeholder="VD: Xin chào! Hiện tại mình đang offline. Mình sẽ phản hồi sớm nhất khi online trở lại. Cảm ơn bạn đã liên hệ! 🙏"
                      value={autoReplyMessage}
                      onChange={(e) => setAutoReplyMessage(e.target.value.slice(0, 500))}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-400">{autoReplyMessage.length}/500 ký tự</p>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">Lịch trình gửi tự động</Label>
                    <p className="text-xs text-gray-500 -mt-1">Chọn khung giờ mà tin nhắn tự động sẽ hoạt động. Ngoài khung giờ này, tin nhắn tự động sẽ không được gửi.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">Từ giờ</label>
                        <select
                          value={autoReplyStartHour}
                          onChange={(e) => setAutoReplyStartHour(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">Đến giờ</label>
                        <select
                          value={autoReplyEndHour}
                          onChange={(e) => setAutoReplyEndHour(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700">
                        {autoReplyStartHour > autoReplyEndHour
                          ? `Tin nhắn tự động sẽ hoạt động từ ${autoReplyStartHour.toString().padStart(2, '0')}:00 tối đến ${autoReplyEndHour.toString().padStart(2, '0')}:00 sáng hôm sau (qua đêm)`
                          : autoReplyStartHour === autoReplyEndHour
                            ? 'Tin nhắn tự động sẽ hoạt động 24/7 (cùng giờ bắt đầu và kết thúc)'
                            : `Tin nhắn tự động sẽ hoạt động từ ${autoReplyStartHour.toString().padStart(2, '0')}:00 đến ${autoReplyEndHour.toString().padStart(2, '0')}:00`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Cooldown */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Thời gian chờ giữa 2 lần gửi</Label>
                    <p className="text-xs text-gray-500 -mt-1">Tránh gửi tin nhắn tự động liên tục cho cùng một khách hàng</p>
                    <select
                      value={autoReplyCooldown}
                      onChange={(e) => setAutoReplyCooldown(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={5}>5 phút</option>
                      <option value={15}>15 phút</option>
                      <option value={30}>30 phút</option>
                      <option value={60}>1 giờ</option>
                      <option value={120}>2 giờ</option>
                      <option value={360}>6 giờ</option>
                      <option value={720}>12 giờ</option>
                      <option value={1440}>24 giờ</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAutoReply}
                  disabled={isSavingAutoReply}
                  className="bg-indigo-600 hover:bg-indigo-700 h-10"
                >
                  {isSavingAutoReply ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal PIN Section */}
        {hasStore && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-semibold text-gray-900">Mã PIN rút tiền</h3>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Mã PIN 6 chữ số để xác nhận khi rút tiền</p>
            </div>

            <div className="p-6 space-y-4">
              {pinMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${pinMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                  {pinMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {pinMessage.text}
                </div>
              )}

              {!pinMode && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {hasPin ? 'Mã PIN đã được thiết lập' : 'Chưa có mã PIN'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {hasPin ? 'Mã PIN sẽ được yêu cầu mỗi khi bạn rút tiền' : 'Bạn cần tạo mã PIN để có thể rút tiền'}
                    </p>
                  </div>
                  {hasPin ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Đã thiết lập
                      </span>
                      <Button variant="outline" size="sm" onClick={() => { setPinMode('change'); setPinMessage(null); }}>
                        Đổi mã PIN
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => { setPinMode('set'); setPinMessage(null); }}
                      className="bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Tạo mã PIN
                    </Button>
                  )}
                </div>
              )}

              {/* Set PIN Form */}
              {pinMode === 'set' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">Tạo mã PIN rút tiền</h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Mã PIN (6 chữ số)</Label>
                      <div className="relative">
                        <Input
                          type={showPin ? 'text' : 'password'}
                          placeholder="Nhập 6 chữ số"
                          value={pinData.pin}
                          onChange={(e) => setPinData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          maxLength={6}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Xác nhận mã PIN</Label>
                      <Input
                        type={showPin ? 'text' : 'password'}
                        placeholder="Nhập lại 6 chữ số"
                        value={pinData.confirmPin}
                        onChange={(e) => setPinData(prev => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        maxLength={6}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setPinMode(null); setPinMessage(null); }}>Hủy</Button>
                    <Button
                      onClick={handleSetPin}
                      disabled={isSavingPin || pinData.pin.length !== 6}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSavingPin ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...</> : 'Tạo mã PIN'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Change PIN Form */}
              {pinMode === 'change' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">Đổi mã PIN rút tiền</h4>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Mã PIN hiện tại</Label>
                      <div className="relative">
                        <Input
                          type={showPin ? 'text' : 'password'}
                          placeholder="Nhập PIN hiện tại"
                          value={pinData.oldPin}
                          onChange={(e) => setPinData(prev => ({ ...prev, oldPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          maxLength={6}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Mã PIN mới (6 chữ số)</Label>
                      <Input
                        type={showPin ? 'text' : 'password'}
                        placeholder="Nhập PIN mới"
                        value={pinData.newPin}
                        onChange={(e) => setPinData(prev => ({ ...prev, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        maxLength={6}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm text-gray-700">Xác nhận mã PIN mới</Label>
                      <Input
                        type={showPin ? 'text' : 'password'}
                        placeholder="Nhập lại PIN mới"
                        value={pinData.confirmNewPin}
                        onChange={(e) => setPinData(prev => ({ ...prev, confirmNewPin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                        maxLength={6}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => { setPinMode(null); setPinMessage(null); }}>Hủy</Button>
                    <Button
                      onClick={handleChangePin}
                      disabled={isSavingPin || pinData.newPin.length !== 6 || pinData.oldPin.length !== 6}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSavingPin ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang đổi...</> : 'Đổi mã PIN'}
                    </Button>
                  </div>
                </div>
              )}
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

              {/* Logo Preview */}
              <div className="flex items-start gap-5 mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {isUploadingLogo || isSavingLogoUrl ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : formData.shopLogo ? (
                      <img src={getFullImageUrl(formData.shopLogo)} alt="Logo" className="w-full h-full object-cover" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-600">
                    Khuyến nghị ảnh vuông, kích thước tối thiểu 200x200px.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG, GIF (động), WEBP</p>
                </div>
              </div>

              {/* Tab Switch */}
              <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setLogoMode('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${logoMode === 'url'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Globe className="w-4 h-4" />
                  Nhập URL
                </button>
                <button
                  type="button"
                  onClick={() => setLogoMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${logoMode === 'upload'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <MonitorUp className="w-4 h-4" />
                  Tải lên từ máy
                </button>
              </div>

              {/* URL Input Mode */}
              {logoMode === 'url' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleLogoUrl}
                      disabled={isSavingLogoUrl || !logoUrl.trim()}
                      className="h-10 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                    >
                      {isSavingLogoUrl ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Lưu URL
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Nhập đường dẫn trực tiếp đến hình ảnh (URL phải bắt đầu bằng https://)
                  </p>
                  {/* URL Preview */}
                  {logoUrl.trim() && (() => { try { new URL(logoUrl.trim()); return true; } catch { return false; } })() && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-200">
                        <img
                          src={logoUrl.trim()}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload Mode */}
              {logoMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    title="Chọn logo cửa hàng (JPG, PNG, GIF, WEBP)"
                  />
                  <div
                    onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isUploadingLogo
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                      }`}
                  >
                    {isUploadingLogo ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-500">Đang tải lên...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-600 font-medium">Nhấn để chọn ảnh từ máy tính</p>
                        <p className="text-xs text-gray-400">JPG, PNG, GIF (động), WEBP - Tối đa 5MB</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">GIF lớn có thể nén tại <a href="https://ezgif.com/optimize" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ezgif.com</a></p>
                </div>
              )}
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
                className="w-full px-3 py-2.5 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">{formData.shopDescription.length}/500 ký tự</p>
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
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-10 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </div>
  );
}
