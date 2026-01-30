'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Wallet, QrCode, Shield, CheckCircle, AlertTriangle, Banknote, ArrowRight } from 'lucide-react';

export default function PaymentGuidePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Hướng dẫn thanh toán</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Hướng dẫn thanh toán</h1>
                <p className="text-green-100 mt-1">Nạp tiền nhanh chóng, an toàn và tiện lợi</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            {/* Payment Methods */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Phương thức thanh toán</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">QR Code / Banking</h3>
                      <p className="text-sm text-green-600">Khuyến nghị</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Chuyển khoản qua mã QR hoặc số tài khoản ngân hàng. Tự động cộng tiền sau 1-5 phút.</p>
                </div>
                <div className="p-5 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Ví điện tử</h3>
                      <p className="text-sm text-gray-500">MoMo, ZaloPay, VNPay</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Thanh toán qua các ví điện tử phổ biến. Cộng tiền tự động ngay lập tức.</p>
                </div>
              </div>
            </section>

            {/* Steps */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Các bước nạp tiền</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Đăng nhập tài khoản</h3>
                    <p className="text-gray-600 text-sm mt-1">Đăng nhập vào tài khoản BachHoaMMO của bạn</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Vào trang Ví tiền</h3>
                    <p className="text-gray-600 text-sm mt-1">Nhấn vào avatar → Chọn &quot;Ví tiền&quot; hoặc truy cập trực tiếp trang /wallet</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nhấn &quot;Nạp tiền&quot;</h3>
                    <p className="text-gray-600 text-sm mt-1">Nhập số tiền muốn nạp (tối thiểu 10,000đ)</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Chuyển khoản theo hướng dẫn</h3>
                    <p className="text-gray-600 text-sm mt-1">Quét mã QR hoặc chuyển khoản theo thông tin hiển thị. <strong>Quan trọng:</strong> Nhập đúng nội dung chuyển khoản!</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-green-800">Hoàn tất!</h3>
                    <p className="text-green-700 text-sm mt-1">Tiền sẽ được cộng vào tài khoản sau 1-5 phút. Nếu quá 30 phút chưa nhận được, vui lòng liên hệ Admin.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Minimum */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hạn mức giao dịch</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Loại giao dịch</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tối thiểu</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Tối đa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Nạp tiền</td>
                      <td className="px-4 py-3 text-gray-600">10,000đ</td>
                      <td className="px-4 py-3 text-gray-600">100,000,000đ</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Rút tiền (Seller)</td>
                      <td className="px-4 py-3 text-gray-600">50,000đ</td>
                      <td className="px-4 py-3 text-gray-600">50,000,000đ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Bảo mật thanh toán
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Mã hóa SSL 256-bit cho mọi giao dịch</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Không lưu trữ thông tin thẻ ngân hàng</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Xác thực 2 lớp (2FA) cho giao dịch lớn</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Hệ thống giám sát giao dịch 24/7</p>
                </div>
              </div>
            </section>

            {/* Warning */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Lưu ý quan trọng</p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Luôn nhập đúng nội dung chuyển khoản để hệ thống tự động xác nhận</li>
                    <li>• Không chuyển tiền cho bất kỳ ai tự xưng là Admin ngoài hệ thống</li>
                    <li>• Lưu lại biên lai giao dịch để đối chiếu khi cần</li>
                    <li>• Liên hệ Admin qua chat nếu gặp vấn đề</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4" />
            Quay lại trang chủ
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
