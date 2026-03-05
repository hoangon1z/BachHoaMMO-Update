'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Search, CreditCard, Package, CheckCircle, Star, Shield, MessageSquare, ArrowRight, Eye, ThumbsUp } from 'lucide-react';

export default function ShoppingGuidePage() {
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
          <span className="text-gray-900 font-medium">Hướng dẫn mua hàng</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Hướng dẫn mua hàng</h1>
                <p className="text-purple-100 mt-1">Mua sắm dễ dàng, an toàn trong vài bước</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            {/* Steps */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Các bước mua hàng</h2>
              
              {/* Step 1 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-blue-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">Đăng ký / Đăng nhập</h3>
                    <p className="text-gray-600 mt-1">Tạo tài khoản hoặc đăng nhập vào BachHoaMMO để bắt đầu mua sắm.</p>
                    <div className="mt-3 flex gap-3">
                      <Link href="/register" className="text-sm text-blue-600 hover:underline">Đăng ký ngay →</Link>
                      <Link href="/login" className="text-sm text-blue-600 hover:underline">Đăng nhập →</Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">Nạp tiền vào ví</h3>
                        <p className="text-gray-600 mt-1">Nạp tiền vào ví BachHoaMMO để mua sản phẩm. Hỗ trợ nhiều phương thức thanh toán.</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-blue-500" />
                    </div>
                    <Link href="/payment-guide" className="text-sm text-blue-600 hover:underline">Xem hướng dẫn nạp tiền →</Link>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">Tìm kiếm sản phẩm</h3>
                        <p className="text-gray-600 mt-1">Duyệt danh mục hoặc sử dụng thanh tìm kiếm để tìm sản phẩm bạn cần.</p>
                      </div>
                      <Search className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link href="/explore" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm hover:border-blue-300">Khám phá</Link>
                      <Link href="/explore?category=game" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm hover:border-blue-300">Game</Link>
                      <Link href="/explore?category=social" className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm hover:border-blue-300">Mạng xã hội</Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">Xem chi tiết & Thêm vào giỏ hàng</h3>
                        <p className="text-gray-600 mt-1">Đọc kỹ mô tả sản phẩm, xem đánh giá từ người mua khác. Nếu ưng ý, thêm vào giỏ hàng.</p>
                      </div>
                      <Eye className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-800"><strong>Mẹo:</strong> Luôn kiểm tra đánh giá và số lượng đã bán của shop trước khi mua.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">Thanh toán</h3>
                        <p className="text-gray-600 mt-1">Kiểm tra giỏ hàng → Nhập mã giảm giá nếu có → hệ thống tự tính giảm → Nhấn &quot;Thanh toán&quot;. Tiền sẽ được trừ từ số dư ví.</p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">6</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">Nhận hàng</h3>
                        <p className="text-gray-600 mt-1">Cách nhận hàng tùy theo loại sản phẩm:</p>
                      </div>
                      <Package className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <p className="font-semibold text-gray-900">📱 Sản phẩm tự động:</p>
                        <p className="text-gray-700">Nhận ngay sau khi thanh toán (tài khoản, key, dịch vụ ảo, v.v.)</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <p className="font-semibold text-gray-900">📦 Sản phẩm thủ công:</p>
                        <p className="text-gray-700">Seller sẽ giao trong vòng 24h qua chat hoặc trang đơn hàng</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <p className="font-semibold text-gray-900">✨ Dịch vụ buff:</p>
                        <p className="text-gray-700">Bắt đầu trong 1-24h, hoàn thành trong thời gian cam kết bởi seller</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 7 */}
              <div className="mb-6">
                <div className="flex gap-4 p-5 bg-green-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">7</div>
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-800 text-lg">Kiểm tra & Xác nhận</h3>
                        <p className="text-green-700 mt-1">Kiểm tra tài khoản/sản phẩm. Nếu đúng mô tả → Xác nhận nhận hàng. Nếu có vấn đề → Mở khiếu nại.</p>
                      </div>
                      <ThumbsUp className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="mt-3 p-3 bg-green-100 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 mb-2">🔒 Escrow 72 giờ:</p>
                      <p className="text-sm text-green-800">Nếu bạn không xác nhận trong 72h, hệ thống sẽ tự động xác nhận và giải phóng tiền cho seller. Hãy kiểm tra kỹ trước deadline!</p>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <span className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" /> Xác nhận trong 24h
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-green-700">
                        <Star className="w-4 h-4" /> Đánh giá shop
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Mẹo mua hàng an toàn
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Ưu tiên seller có huy hiệu xác minh (verified badge)</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Kiểm tra thời gian phản hồi trung bình của seller</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Đọc kỹ mô tả sản phẩm trước khi mua</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Chat với seller nếu có thắc mắc</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Kiểm tra kỹ sản phẩm trước khi xác nhận</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Sử dụng mã giảm giá từ seller để tiết kiệm thêm</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Đổi mật khẩu ngay sau khi nhận tài khoản</p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">Liên hệ Admin nếu gặp vấn đề</p>
                </div>
              </div>
            </section>

            {/* Discount Code Guide */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hướng dẫn sử dụng mã giảm giá</h2>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">📍 Nơi nhập mã</h3>
                  <p className="text-sm text-gray-700">Tại trang thanh toán (Bước 5), có ô nhập mã giảm giá</p>
                </div>
                <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">✅ Cách áp dụng</h3>
                  <p className="text-sm text-gray-700">Nhập mã → Nhấn Áp dụng → Hệ thống tự tính và hiển thị số tiền giảm</p>
                </div>
                <div className="p-4 bg-purple-50 border-l-4 border-purple-600 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">👤 Nguồn mã giảm giá</h3>
                  <p className="text-sm text-gray-700">Do Seller tạo ra, có thể dùng để: khuyến mãi, bồi thường khách hàng</p>
                </div>
                <div className="p-4 bg-amber-50 border-l-4 border-amber-600 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">⚙️ Điều kiện áp dụng</h3>
                  <p className="text-sm text-gray-700">Mỗi mã có thể có: giới hạn lượt dùng, thời hạn sử dụng, đơn hàng tối thiểu</p>
                </div>
                <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl">
                  <h3 className="font-semibold text-gray-900 mb-1">❌ Nếu mã không hoạt động</h3>
                  <p className="text-sm text-gray-700">Kiểm tra: hạn dùng, đơn hàng tối thiểu, và seller tương ứng có hoạt động không</p>
                </div>
              </div>
            </section>

            {/* Support */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800">Cần hỗ trợ?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Đội ngũ Admin luôn sẵn sàng hỗ trợ bạn 24/7. Liên hệ qua Hotline hoặc sử dụng nút chat trong ứng dụng.
                  </p>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2 text-sm text-blue-700 font-semibold">
                      <span>📞 Hotline:</span>
                      <a href="tel:0879062222" className="text-blue-600 hover:underline">0879.06.2222</a>
                    </div>
                    <a href="https://t.me/bachhoammobot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      Liên hệ qua Telegram →
                    </a>
                  </div>
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
