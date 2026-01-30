'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Shield, Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export default function RefundPolicyPage() {
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
          <span className="text-gray-900 font-medium">Chính sách đổi trả</span>
        </nav>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <RefreshCw className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Chính sách đổi trả</h1>
                <p className="text-blue-100 mt-1">Cập nhật lần cuối: 29/01/2026</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8 space-y-8">
            {/* Quick Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Thời gian khiếu nại</span>
                </div>
                <p className="text-sm text-green-700">Trong vòng 24h sau khi nhận hàng</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Bảo vệ người mua</span>
                </div>
                <p className="text-sm text-blue-700">Hoàn tiền 100% nếu không đúng mô tả</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Hỗ trợ 24/7</span>
                </div>
                <p className="text-sm text-purple-700">Đội ngũ Admin luôn sẵn sàng hỗ trợ</p>
              </div>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                Điều kiện đổi trả / Hoàn tiền
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Được hoàn tiền khi:</p>
                    <ul className="mt-2 text-sm text-green-700 space-y-1">
                      <li>• Tài khoản không đúng mô tả (sai level, sai thông tin...)</li>
                      <li>• Tài khoản bị khóa/ban ngay sau khi mua</li>
                      <li>• Tài khoản đã được bán cho người khác</li>
                      <li>• Seller không giao hàng trong thời gian quy định</li>
                      <li>• Thông tin đăng nhập không hoạt động</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Không được hoàn tiền khi:</p>
                    <ul className="mt-2 text-sm text-red-700 space-y-1">
                      <li>• Đã xác nhận nhận hàng thành công</li>
                      <li>• Hết thời gian khiếu nại (24h)</li>
                      <li>• Tài khoản bị khóa do lỗi người mua (đổi thông tin, vi phạm...)</li>
                      <li>• Khách hàng cố tình gian lận</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                Quy trình khiếu nại
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mở khiếu nại</h3>
                    <p className="text-gray-600 text-sm mt-1">Vào chi tiết đơn hàng → Nhấn &quot;Khiếu nại&quot; → Chọn lý do và mô tả chi tiết</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Cung cấp bằng chứng</h3>
                    <p className="text-gray-600 text-sm mt-1">Chụp màn hình, video minh chứng vấn đề gặp phải</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Chờ xử lý</h3>
                    <p className="text-gray-600 text-sm mt-1">Seller sẽ phản hồi trong 24h. Nếu không thỏa thuận được, Admin sẽ can thiệp</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nhận kết quả</h3>
                    <p className="text-gray-600 text-sm mt-1">Hoàn tiền về số dư tài khoản nếu khiếu nại hợp lệ</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">3</span>
                Thời gian xử lý
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Loại yêu cầu</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Thời gian xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Khiếu nại thông thường</td>
                      <td className="px-4 py-3 text-gray-600">24-48 giờ</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Khiếu nại cần Admin can thiệp</td>
                      <td className="px-4 py-3 text-gray-600">48-72 giờ</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Hoàn tiền sau khi duyệt</td>
                      <td className="px-4 py-3 text-gray-600">Ngay lập tức</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Warning */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Lưu ý quan trọng</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Mọi hành vi gian lận, lạm dụng chính sách đổi trả sẽ bị khóa tài khoản vĩnh viễn và không được hoàn tiền.
                    Vui lòng kiểm tra kỹ sản phẩm trước khi xác nhận nhận hàng.
                  </p>
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
