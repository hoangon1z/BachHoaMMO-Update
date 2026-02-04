'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Store, FileText, Package, CreditCard, Shield, 
  CheckCircle, Star, AlertTriangle, TrendingUp, Users, 
  MessageSquare, Clock, Percent, Award, Ban, BookOpen,
  DollarSign, Settings, Bell, Upload, Tags, BarChart3
} from 'lucide-react';

export default function SellerGuidePage() {
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
          <span className="text-gray-900 font-medium">Chính sách & Hướng dẫn Seller</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Chính sách & Hướng dẫn Seller</h1>
                <p className="text-emerald-100 mt-1">Tất cả những gì bạn cần để bắt đầu bán hàng</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-10">
            
            {/* Quick Start */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Bắt đầu bán hàng
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-4 p-5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Đăng ký tài khoản & Xác minh</h3>
                    <p className="text-gray-600 mt-1 text-sm">Đăng ký tài khoản BachHoaMMO và bật xác thực 2 bước (2FA) để bảo vệ tài khoản. Xác minh email để có thể bán hàng.</p>
                    <Link href="/register" className="text-sm text-emerald-600 hover:underline mt-2 inline-block">Đăng ký ngay →</Link>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Thiết lập Shop</h3>
                    <p className="text-gray-600 mt-1 text-sm">Vào <strong>Seller Dashboard → Cài đặt</strong> để thiết lập thông tin shop: tên shop, logo, mô tả, liên kết Telegram để nhận thông báo đơn hàng.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Đăng sản phẩm đầu tiên</h3>
                    <p className="text-gray-600 mt-1 text-sm">Vào <strong>Sản phẩm → Thêm mới</strong>. Điền thông tin sản phẩm: tên, mô tả chi tiết, giá bán, upload ảnh đẹp và chọn danh mục phù hợp.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Thêm kho hàng (Giao tự động)</h3>
                    <p className="text-gray-600 mt-1 text-sm">Với sản phẩm giao tự động: vào <strong>Kho hàng → Thêm</strong> để upload tài khoản/key. Hệ thống sẽ tự động giao cho khách sau khi thanh toán.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Bắt đầu nhận đơn hàng!</h3>
                    <p className="text-gray-600 mt-1 text-sm">Sản phẩm sẽ xuất hiện trên trang chủ và trong kết quả tìm kiếm. Khi có đơn hàng, bạn sẽ nhận thông báo qua Telegram/Email.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Loại giao hàng */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Phương thức giao hàng
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-green-800">Giao tự động (Auto)</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-green-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Khách nhận hàng ngay sau khi thanh toán</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Upload sẵn tài khoản/key vào kho hàng</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Hệ thống tự động trừ kho và gửi cho khách</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Được ưu tiên hiển thị trên trang chủ</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-orange-800">Giao thủ công (Manual)</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-orange-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Seller tự giao hàng cho khách</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Phù hợp dịch vụ nâng cấp, boost, v.v.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Phải giao trong vòng 24 giờ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Quá hạn sẽ bị cảnh cáo/khóa shop</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Phí & Thanh toán */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Phí & Thanh toán
              </h2>
              
              <div className="space-y-4">
                <div className="p-5 bg-amber-50 rounded-xl border border-amber-100">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    Phí hoa hồng
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-600">5%</p>
                      <p className="text-sm text-gray-600 mt-1">Sản phẩm giao tự động</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-600">7%</p>
                      <p className="text-sm text-gray-600 mt-1">Sản phẩm giao thủ công</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">0đ</p>
                      <p className="text-sm text-gray-600 mt-1">Phí đăng sản phẩm</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Rút tiền
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>Rút tiền về ngân hàng Việt Nam bất kỳ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>Xử lý trong 24-48 giờ làm việc</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>Số dư tối thiểu để rút: 100.000đ</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>Không phí rút tiền</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Quy định */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Quy định bắt buộc
              </h2>
              
              <div className="space-y-4">
                {/* Được phép */}
                <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Được phép bán
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm text-green-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Tài khoản game, phần mềm bản quyền</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Key license, subscription</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Dịch vụ nâng cấp, boost, farm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Gift card, voucher</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Tool, phần mềm hợp pháp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Dịch vụ thiết kế, marketing</span>
                    </div>
                  </div>
                </div>

                {/* Cấm */}
                <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                  <h3 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
                    <Ban className="w-5 h-5" />
                    Nghiêm cấm
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm text-red-700">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Tài khoản lừa đảo, scam, gian lận</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Hack, cheat, exploit game</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Phần mềm crack, vi phạm bản quyền</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Nội dung 18+, bạo lực, phản động</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Tài khoản ngân hàng, CMND, v.v.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4" />
                      <span>Dịch vụ DDOS, spam, attack</span>
                    </div>
                  </div>
                </div>

                {/* Hình phạt */}
                <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
                  <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Hình phạt vi phạm
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium text-xs">Lần 1</span>
                      <span className="text-gray-700">Cảnh cáo + Xóa sản phẩm vi phạm</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium text-xs">Lần 2</span>
                      <span className="text-gray-700">Khóa shop 7 ngày + Giữ tiền để xử lý khiếu nại</span>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-medium text-xs">Lần 3</span>
                      <span className="text-gray-700">Khóa vĩnh viễn + Tịch thu số dư</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tips thành công */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Bí quyết bán hàng thành công
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Upload className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Ảnh sản phẩm đẹp</h4>
                  </div>
                  <p className="text-sm text-gray-600">Sử dụng ảnh rõ nét, có logo shop. Ảnh đầu tiên rất quan trọng - đây là cái khách nhìn thấy đầu tiên.</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Mô tả chi tiết</h4>
                  </div>
                  <p className="text-sm text-gray-600">Viết mô tả đầy đủ: tính năng, thời hạn, hướng dẫn sử dụng, chính sách bảo hành.</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Tags className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Giá cạnh tranh</h4>
                  </div>
                  <p className="text-sm text-gray-600">Nghiên cứu giá thị trường. Đặt giá hợp lý, có thể giảm giá để thu hút khách mới.</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Phản hồi nhanh</h4>
                  </div>
                  <p className="text-sm text-gray-600">Trả lời tin nhắn khách hàng trong 5 phút. Kết nối Telegram để nhận thông báo realtime.</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Sản phẩm chất lượng</h4>
                  </div>
                  <p className="text-sm text-gray-600">Chỉ bán sản phẩm thật, đúng mô tả. Đánh giá tốt = nhiều khách hàng quay lại.</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Theo dõi thống kê</h4>
                  </div>
                  <p className="text-sm text-gray-600">Kiểm tra Dashboard thường xuyên để theo dõi doanh số, tối ưu sản phẩm bán chạy.</p>
                </div>
              </div>
            </section>

            {/* API Integration */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Tích hợp API (Nâng cao)
              </h2>
              
              <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-sm text-indigo-800 mb-4">
                  BachHoaMMO cung cấp API cho phép seller tự động hóa việc quản lý kho hàng, đồng bộ với hệ thống của bạn.
                </p>
                <div className="grid md:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Thêm/xóa kho hàng tự động</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Đồng bộ sản phẩm</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Webhook thông báo đơn hàng</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Tra cứu đơn hàng</span>
                  </div>
                </div>
                <Link href="/seller/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  <Settings className="w-4 h-4" />
                  Lấy API Key
                </Link>
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
                    Đội ngũ Admin luôn sẵn sàng hỗ trợ seller 24/7. Liên hệ qua chat hoặc Telegram.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <a href="https://t.me/bachhoammobot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      Telegram hỗ trợ →
                    </a>
                    <Link href="/seller/dashboard" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      Vào Seller Dashboard →
                    </Link>
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
