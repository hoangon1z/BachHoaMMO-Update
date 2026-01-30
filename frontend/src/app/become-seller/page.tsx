'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { 
  Store, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, 
  Mail, User, Phone, FileText, ShieldCheck, X, Package, TrendingUp
} from 'lucide-react';

interface SellerApplication {
  id: string;
  fullName: string;
  shopName: string;
  email: string;
  phone: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, logout, checkAuth, isInitialized } = useAuthStore();
  
  const [existingApplication, setExistingApplication] = useState<SellerApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    shopName: '',
    email: '',
    phone: '',
    description: '',
    agreement: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
      fetchExistingApplication();
    }
  }, [user]);

  const fetchExistingApplication = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/seller-application', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingApplication(data);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreement) {
      setErrorMessage('Vui lòng đồng ý với điều khoản');
      return;
    }

    if (!formData.fullName.trim() || !formData.shopName.trim() || !formData.email.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/seller-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        setShowSuccessModal(true);
        fetchExistingApplication();
      } else {
        setErrorMessage(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrorMessage('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <Store className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Đăng nhập để tiếp tục</h2>
          <p className="text-gray-500 mb-6">Vui lòng đăng nhập để đăng ký trở thành người bán</p>
          <Button 
            onClick={() => router.push('/login?redirect=/become-seller')}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            Đăng nhập ngay
          </Button>
        </div>
      </div>
    );
  }

  // Already a seller
  if (user.isSeller) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Bạn đã là Seller!</h1>
            <p className="text-gray-600 mb-6">Bạn đã có thể bắt đầu đăng bán sản phẩm.</p>
            <Button 
              onClick={() => router.push('/seller')}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
            >
              <Store className="w-5 h-5 mr-2" />
              Vào Seller Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Đăng ký bán hàng</span>
        </nav>

        {/* Existing Application Status */}
        {existingApplication && (
          <div className={`mb-6 p-5 rounded-xl border ${
            existingApplication.status === 'PENDING' ? 'bg-amber-50 border-amber-200' :
            existingApplication.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-4">
              {existingApplication.status === 'PENDING' && <Clock className="w-6 h-6 text-amber-600" />}
              {existingApplication.status === 'APPROVED' && <CheckCircle2 className="w-6 h-6 text-green-600" />}
              {existingApplication.status === 'REJECTED' && <AlertCircle className="w-6 h-6 text-red-600" />}
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  existingApplication.status === 'PENDING' ? 'text-amber-800' :
                  existingApplication.status === 'APPROVED' ? 'text-green-800' :
                  'text-red-800'
                }`}>
                  {existingApplication.status === 'PENDING' && 'Đơn đăng ký đang chờ duyệt'}
                  {existingApplication.status === 'APPROVED' && 'Đơn đăng ký đã được duyệt'}
                  {existingApplication.status === 'REJECTED' && 'Đơn đăng ký bị từ chối'}
                </h3>
                <p className={`text-sm mt-1 ${
                  existingApplication.status === 'PENDING' ? 'text-amber-700' :
                  existingApplication.status === 'APPROVED' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                  Shop: {existingApplication.shopName} • Gửi lúc: {new Date(existingApplication.createdAt).toLocaleString('vi-VN')}
                </p>
                {existingApplication.adminNote && (
                  <p className="text-sm mt-2 p-2 bg-white/50 rounded-lg">
                    <strong>Phản hồi:</strong> {existingApplication.adminNote}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-4">Lợi ích khi trở thành Seller</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-sm">Mở gian hàng riêng</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm">Tiếp cận ngàn khách hàng</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-sm">Quản lý đơn hàng dễ dàng</span>
            </div>
          </div>
        </div>

        {/* Form */}
        {(!existingApplication || existingApplication.status === 'REJECTED') && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h1 className="text-xl font-bold text-gray-900">Đăng ký trở thành Seller</h1>
              <p className="text-sm text-gray-500 mt-1">Điền thông tin bên dưới để bắt đầu bán hàng</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="h-11"
                />
              </div>

              {/* Shop Name */}
              <div className="space-y-2">
                <Label htmlFor="shopName" className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-gray-400" />
                  Tên gian hàng <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shopName"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="Shop ABC"
                  className="h-11"
                />
                <p className="text-xs text-gray-500">Tên sẽ hiển thị trên gian hàng của bạn</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email liên hệ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="h-11"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0123 456 789"
                  className="h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Mô tả về gian hàng
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Giới thiệu về sản phẩm bạn muốn bán, kinh nghiệm..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Agreement */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreement}
                    onChange={(e) => setFormData({ ...formData, agreement: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="text-sm">
                    <span className="text-gray-700">Tôi đã đọc và đồng ý với </span>
                    <Link href="/terms" className="text-blue-600 hover:underline">Điều khoản dịch vụ</Link>
                    <span className="text-gray-700"> và </span>
                    <Link href="/privacy" className="text-blue-600 hover:underline">Chính sách bảo mật</Link>
                    <span className="text-gray-700"> của BachHoaMMO.</span>
                    <span className="text-red-500"> *</span>
                  </div>
                </label>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Gửi đơn đăng ký
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Gửi đơn thành công!</h2>
              <p className="text-gray-600 mb-6">
                Đơn đăng ký của bạn đã được gửi đi. Admin sẽ xem xét và phản hồi trong vòng 24-48 giờ.
              </p>
              <Button 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowSuccessModal(false)}
              >
                Đã hiểu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
