'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Settings, Bell, Shield, Globe, Palette, Lock, Smartphone, Mail, ChevronRight, Moon, Sun, Monitor, Check, Loader2, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { apiFetch } from '@/lib/config';

export default function SettingsPage() {
  const { user, checkAuth, logout, isInitialized, refreshUser } = useAuthStore();
  const router = useRouter();
  const toast = useToast();
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    orderNotifications: true,
    promotionNotifications: false,
    showProfile: true,
    showHistory: false,
    language: 'vi',
    timezone: 'asia/ho_chi_minh',
    theme: 'light',
    twoFactorEnabled: false,
  });
  
  // Modals and loading states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // 2FA disable form
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);
  
  // Fetch user's 2FA status
  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);
  
  const fetchUserSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          twoFactorEnabled: data.twoFactorEnabled || false,
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    if (key === 'twoFactorEnabled') {
      setShow2FAModal(true);
      return;
    }
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success('Đã lưu cài đặt');
  };
  
  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      
      if (res.ok) {
        toast.success('Đổi mật khẩu thành công');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast.error(data.message || 'Không thể đổi mật khẩu');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enable/Disable 2FA
  const handle2FAToggle = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (settings.twoFactorEnabled) {
        // Disable 2FA
        const res = await apiFetch('/auth/2fa/disable', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: disable2FAPassword }),
        });
        
        if (res.ok) {
          setSettings(prev => ({ ...prev, twoFactorEnabled: false }));
          toast.success('Đã tắt xác thực 2 bước');
          setShow2FAModal(false);
          setDisable2FAPassword('');
        } else {
          const data = await res.json();
          toast.error(data.message || 'Không thể tắt 2FA');
        }
      } else {
        // Enable 2FA
        const res = await apiFetch('/auth/2fa/enable', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          setSettings(prev => ({ ...prev, twoFactorEnabled: true }));
          toast.success('Đã bật xác thực 2 bước', 'Mã OTP sẽ được gửi qua email khi đăng nhập');
          setShow2FAModal(false);
        } else {
          const data = await res.json();
          toast.error(data.message || 'Không thể bật 2FA');
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <Settings className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để tiếp tục</h2>
          <p className="text-gray-500 mb-6">Vui lòng đăng nhập để xem cài đặt</p>
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

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );

  const themeOptions = [
    { id: 'light', icon: Sun, label: 'Sáng' },
    { id: 'dark', icon: Moon, label: 'Tối' },
    { id: 'system', icon: Monitor, label: 'Hệ thống' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Cài đặt</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
          <p className="text-gray-500 mt-1">Tùy chỉnh tài khoản và ứng dụng theo ý bạn</p>
        </div>

        <div className="space-y-6">
          {/* Notifications Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Thông báo</h3>
                <p className="text-sm text-gray-500">Quản lý cách bạn nhận thông báo</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Email thông báo</p>
                    <p className="text-sm text-gray-500">Nhận thông báo qua email</p>
                  </div>
                </div>
                <ToggleSwitch enabled={settings.emailNotifications} onChange={() => toggleSetting('emailNotifications')} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Cập nhật đơn hàng</p>
                  <p className="text-sm text-gray-500">Thông báo khi đơn hàng thay đổi trạng thái</p>
                </div>
                <ToggleSwitch enabled={settings.orderNotifications} onChange={() => toggleSetting('orderNotifications')} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Khuyến mãi & Ưu đãi</p>
                  <p className="text-sm text-gray-500">Nhận tin về các chương trình khuyến mãi</p>
                </div>
                <ToggleSwitch enabled={settings.promotionNotifications} onChange={() => toggleSetting('promotionNotifications')} />
              </div>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Quyền riêng tư</h3>
                <p className="text-sm text-gray-500">Kiểm soát thông tin cá nhân</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Hiển thị hồ sơ</p>
                  <p className="text-sm text-gray-500">Cho phép người khác xem hồ sơ của bạn</p>
                </div>
                <ToggleSwitch enabled={settings.showProfile} onChange={() => toggleSetting('showProfile')} />
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Lịch sử mua hàng</p>
                  <p className="text-sm text-gray-500">Hiển thị lịch sử công khai</p>
                </div>
                <ToggleSwitch enabled={settings.showHistory} onChange={() => toggleSetting('showHistory')} />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bảo mật</h3>
                <p className="text-sm text-gray-500">Bảo vệ tài khoản của bạn</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Đổi mật khẩu</p>
                    <p className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Xác thực 2 bước</p>
                    <p className="text-sm text-gray-500">
                      {settings.twoFactorEnabled ? 'Đang bật - Mã OTP sẽ gửi qua email' : 'Bảo mật tài khoản với OTP qua email'}
                    </p>
                  </div>
                </div>
                <ToggleSwitch enabled={settings.twoFactorEnabled} onChange={() => toggleSetting('twoFactorEnabled')} />
              </div>
            </div>
          </div>

          {/* Language & Region */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ngôn ngữ & Khu vực</h3>
                <p className="text-sm text-gray-500">Cài đặt ngôn ngữ và múi giờ</p>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
                <select 
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Múi giờ</label>
                <select 
                  value={settings.timezone}
                  onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="asia/ho_chi_minh">GMT+7 (Hà Nội, Hồ Chí Minh)</option>
                  <option value="asia/bangkok">GMT+7 (Bangkok)</option>
                  <option value="asia/singapore">GMT+8 (Singapore)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Giao diện</h3>
                <p className="text-sm text-gray-500">Tùy chỉnh giao diện ứng dụng</p>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Chế độ hiển thị</label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSettings(prev => ({ ...prev, theme: theme.id }))}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      settings.theme === theme.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <theme.icon className={`w-6 h-6 mx-auto mb-2 ${
                      settings.theme === theme.id ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                    <p className={`text-sm font-medium ${
                      settings.theme === theme.id ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {theme.label}
                    </p>
                    {settings.theme === theme.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSave}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25"
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
      
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h2>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mật khẩu hiện tại</label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="h-11 pr-10 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Mật khẩu mới</label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="h-11 pr-10 rounded-xl"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="h-11 pr-10 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đổi mật khẩu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {settings.twoFactorEnabled ? 'Tắt xác thực 2 bước' : 'Bật xác thực 2 bước'}
              </h2>
              <button 
                onClick={() => { setShow2FAModal(false); setDisable2FAPassword(''); }}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              {settings.twoFactorEnabled ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <p className="text-gray-600">
                      Để tắt xác thực 2 bước, vui lòng nhập mật khẩu của bạn để xác nhận.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="password"
                      value={disable2FAPassword}
                      onChange={(e) => setDisable2FAPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="h-11 rounded-xl"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                        onClick={() => { setShow2FAModal(false); setDisable2FAPassword(''); }}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handle2FAToggle}
                        disabled={isLoading || !disable2FAPassword}
                        className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tắt 2FA'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Bảo vệ tài khoản của bạn</h3>
                    <p className="text-gray-600 text-sm">
                      Khi bật xác thực 2 bước, mỗi lần đăng nhập bạn sẽ nhận được mã OTP qua email để xác nhận.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Lợi ích:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>✓ Bảo vệ tài khoản khỏi truy cập trái phép</li>
                        <li>✓ Thông báo ngay khi có ai đăng nhập</li>
                        <li>✓ Mã OTP gửi qua email: {user?.email}</li>
                      </ul>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                        onClick={() => setShow2FAModal(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        onClick={handle2FAToggle}
                        disabled={isLoading}
                        className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bật 2FA'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
