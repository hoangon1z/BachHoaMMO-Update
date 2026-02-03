'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Calendar, Shield, Camera, Edit3, Save, X, Package, Wallet, Settings, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, checkAuth, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const { isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để tiếp tục</h2>
          <p className="text-gray-500 mb-6">Vui lòng đăng nhập để xem thông tin cá nhân</p>
          <Button 
            onClick={() => router.push('/login')}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        setIsEditing(false);
        setSaveMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveMessage({ type: 'error', text: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WEBP)' });
      return;
    }

    // Validate file size (5MB max - backend/server limit)
    const maxSize = 5 * 1024 * 1024; // 5MB for all file types
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setSaveMessage({ 
        type: 'error', 
        text: `File quá lớn (${fileSizeMB}MB). Vui lòng chọn file nhỏ hơn 5MB${file.type === 'image/gif' ? '. Tip: Nén GIF tại ezgif.com' : ''}` 
      });
      return;
    }

    setIsUploadingAvatar(true);
    setSaveMessage(null);

    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', file);

      // Gửi qua API Next.js (cùng origin) để proxy lên backend, tránh lỗi CORS / URL
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        const avatarUrl = data.avatar || '';
        updateUser({ avatar: avatarUrl });
        setSaveMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra khi tải ảnh lên' }));
        setSaveMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra khi tải ảnh lên' });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setSaveMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const quickLinks = [
    { icon: Package, label: 'Đơn hàng của tôi', href: '/orders', color: 'bg-orange-500' },
    { icon: Wallet, label: 'Ví của tôi', href: '/wallet', color: 'bg-green-500' },
    { icon: Settings, label: 'Cài đặt', href: '/settings', color: 'bg-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onLogout={handleLogout}
        onSearch={handleSearch}
      />
      
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Thông tin cá nhân</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Avatar & Quick Links */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
                    {isUploadingAvatar ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name || user.email}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    title="Chọn ảnh đại diện (JPG, PNG, GIF, WEBP)"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                    title="Chọn ảnh đại diện (hỗ trợ GIF động)"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900">{user.name || 'User'}</h2>
                <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                
                {saveMessage && (
                  <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    saveMessage.type === 'success' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {saveMessage.text}
                  </div>
                )}
                
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                  user.role === 'ADMIN' 
                    ? 'bg-purple-100 text-purple-700' 
                    : user.role === 'SELLER' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'SELLER' ? 'Người bán' : 'Khách hàng'}
                </span>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                {/* Balance - Full Width */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">Số dư ví</p>
                        <p className="text-lg font-bold text-green-700 truncate max-w-[180px]" title={user.balance ? `${new Intl.NumberFormat('vi-VN').format(user.balance)}đ` : '0đ'}>
                          {user.balance ? (
                            user.balance >= 1000000000 
                              ? `${(user.balance / 1000000000).toFixed(user.balance % 1000000000 === 0 ? 0 : 1)}T đ`
                              : user.balance >= 1000000 
                                ? `${(user.balance / 1000000).toFixed(user.balance % 1000000 === 0 ? 0 : 1)}Tr đ`
                                : `${new Intl.NumberFormat('vi-VN').format(user.balance)}đ`
                          ) : '0đ'}
                        </p>
                      </div>
                    </div>
                    <Link href="/wallet" className="text-xs text-green-600 hover:text-green-700 font-medium">
                      Nạp tiền →
                    </Link>
                  </div>
                  {user.balance && user.balance >= 1000000 && (
                    <p className="text-xs text-green-600/70 mt-2 pl-[52px]">
                      = {new Intl.NumberFormat('vi-VN').format(user.balance)}đ
                    </p>
                  )}
                </div>
                
                {/* Orders Count */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-orange-600 font-medium">Đơn hàng</p>
                        <p className="text-lg font-bold text-orange-700">0</p>
                      </div>
                    </div>
                    <Link href="/orders" className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                      Xem tất cả →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {quickLinks.map((link, index) => (
                <Link 
                  key={index} 
                  href={link.href}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center`}>
                      <link.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-gray-900">{link.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Thông tin cá nhân</h3>
                  <p className="text-sm text-gray-500">Quản lý thông tin tài khoản của bạn</p>
                </div>
                {!isEditing ? (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline" 
                    className="h-10 px-4 rounded-xl border-gray-200"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Chỉnh sửa
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="outline" 
                      className="h-10 px-4 rounded-xl border-gray-200"
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Hủy
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {isSaving ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Họ và tên</Label>
                    {isEditing ? (
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="h-12 pl-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white"
                          placeholder="Nhập họ và tên"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-gray-50 rounded-xl">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{formData.name || '—'}</span>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-gray-50 rounded-xl">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">{formData.email}</span>
                      <Shield className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Số điện thoại</Label>
                    {isEditing ? (
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="h-12 pl-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white"
                          placeholder="Nhập số điện thoại"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 h-12 px-4 bg-gray-50 rounded-xl">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-900">{formData.phone || '—'}</span>
                      </div>
                    )}
                  </div>

                  {/* Join Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Ngày tham gia</Label>
                    <div className="flex items-center gap-3 h-12 px-4 bg-gray-50 rounded-xl">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address - Full Width */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Địa chỉ</Label>
                  {isEditing ? (
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full min-h-[100px] pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-colors"
                        placeholder="Nhập địa chỉ"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 min-h-[60px] p-4 bg-gray-50 rounded-xl">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-900">{formData.address || '—'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
