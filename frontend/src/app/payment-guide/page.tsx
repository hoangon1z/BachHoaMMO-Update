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
                <div className="p-5 border border-green-300 rounded-xl hover:border-green-400 transition-colors bg-green-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">BIDV</h3>
                      <p className="text-sm text-green-600">QR Code & Chuyển khoản</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Tự động sau 1-5 phút</p>
                    <span className="inline-block px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">Khuyến nghị</span>
                  </div>
                </div>
                <div className="p-5 border border-blue-300 rounded-xl hover:border-blue-400 transition-colors bg-blue-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">MB Bank (MBBank)</h3>
                      <p className="text-sm text-blue-600">QR Code & Chuyển khoản</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Tự động sau 1-5 phút</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800"><strong>💡 Lưu ý:</strong> Hệ thống tự động nhận tiền 24/7, không cần thông báo sau khi chuyển khoản. Tiền sẽ được cộng ngay khi hệ thống nhận được chuyển khoản đúng nội dung.</p>
              </div>
            </section>

            {/* Steps */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Các bước nạp tiền</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Đăng nhập & Nạp tiền</h3>
                    <p className="text-gray-600 text-sm mt-1">Đăng nhập vào tài khoản → Vào menu avatar → Nhấn <strong>&apos;Nạp tiền ngay&apos;</strong> (nút xanh lá)</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Chọn ngân hàng</h3>
                    <p className="text-gray-600 text-sm mt-1">Chọn một trong 2 ngân hàng: <strong>BIDV</strong> hoặc <strong>MB Bank (MBBank)</strong></p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nhập số tiền</h3>
                    <p className="text-gray-600 text-sm mt-1">Nhập số tiền muốn nạp (tối thiểu <strong>10.000đ</strong>). Hệ thống sẽ tính phí nếu có.</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">QR Code & Nội dung chuyển khoản</h3>
                    <p className="text-gray-600 text-sm mt-1">Hệ thống sẽ tạo mã QR + thông tin chuyển khoản với <strong>nội dung tự động</strong> (dạng số orderCode)</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Chuyển khoản - ⚠️ LƯU Ý QUAN TRỌNG</h3>
                    <p className="text-amber-800 text-sm mt-1">Nhập <strong>ĐÚNG nội dung chuyển khoản</strong> để hệ thống tự động nhận biết. Nội dung thường là dạng số (orderCode). Sai nội dung = phải liên hệ Admin để xác nhận thủ công.</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex gap-4 p-4 bg-green-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">6</div>
                  <div>
                    <h3 className="font-semibold text-green-800">Tiền cộng tự động!</h3>
                    <p className="text-green-700 text-sm mt-1">Tiền sẽ được cộng tự động sau <strong>1-5 phút</strong> khi hệ thống nhận được chuyển khoản đúng nội dung. Bạn sẽ nhận thông báo khi tiền được cộng vào tài khoản.</p>
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
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl md:col-span-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Webhook signature verification cho mọi giao dịch ngân hàng</p>
                </div>
              </div>
            </section>

            {/* Withdrawal Policy */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Chính sách rút tiền (Seller)</h2>
              <div className="space-y-3">
                <div className="p-4 border-l-4 border-green-600 bg-green-50 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">Miễn phí</h3>
                  <p className="text-sm text-gray-700">2 lần rút tiền mỗi tuần (Thứ 2 - Chủ nhật)</p>
                </div>
                <div className="p-4 border-l-4 border-amber-600 bg-amber-50 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">Phí rút tiền</h3>
                  <p className="text-sm text-gray-700">Từ lần rút thứ 3 trở đi: tính phí % (hiển thị tại trang rút tiền)</p>
                </div>
                <div className="p-4 border-l-4 border-blue-600 bg-blue-50 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">Thời gian xử lý</h3>
                  <p className="text-sm text-gray-700">Xử lý trong 24 giờ làm việc kể từ khi yêu cầu</p>
                </div>
                <div className="p-4 border-l-4 border-purple-600 bg-purple-50 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">Yêu cầu tài khoản</h3>
                  <p className="text-sm text-gray-700">Cần tài khoản ngân hàng <strong>đúng tên đăng ký</strong> trên BachHoaMMO</p>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Xử lý sự cố</h2>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
                <h3 className="font-semibold text-red-900 mb-3">Chuyển khoản xong nhưng chưa nhận tiền sau 30 phút?</h3>
                <div className="space-y-3 text-sm text-red-800">
                  <p><strong>1. Kiểm tra:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>✓ Nội dung chuyển khoản đúng không?</li>
                    <li>✓ Số tài khoản đúng không?</li>
                    <li>✓ Chuyển vào đúng ngân hàng không? (BIDV hoặc MB Bank)</li>
                  </ul>
                  <p><strong>2. Chuẩn bị:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>✓ Chụp màn hình biên lai giao dịch từ ngân hàng</li>
                  </ul>
                  <p><strong>3. Liên hệ:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>✓ Hotline: <strong>0879.06.2222</strong></li>
                    <li>✓ Hoặc chat trực tiếp với Admin trong ứng dụng</li>
                  </ul>
                  <p><strong>4. Cung cấp thông tin:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>✓ Mã giao dịch ngân hàng (Reference/Transaction ID)</li>
                    <li>✓ Số tiền chuyển khoản</li>
                    <li>✓ Thời gian chuyển khoản</li>
                  </ul>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <div className="space-y-3 text-sm text-red-800">
                  <p className="font-semibold">⚠️ BẢO VỆ TÀI KHOẢN:</p>
                  <ul className="space-y-2">
                    <li>• <strong>KHÔNG</strong> chuyển tiền cho bất kỳ ai tự xưng là Admin ngoài hệ thống</li>
                    <li>• Admin <strong>KHÔNG BAO GIỜ</strong> hỏi mật khẩu hoặc OTP của bạn</li>
                    <li>• Luôn liên hệ qua Hotline chính thức hoặc chat trong ứng dụng</li>
                  </ul>
                </div>
              </div>
            </section>
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
