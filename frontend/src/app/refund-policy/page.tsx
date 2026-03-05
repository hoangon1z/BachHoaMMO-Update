'use client';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Shield, Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare, Phone, Mail } from 'lucide-react';

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
                <p className="text-blue-100 mt-1">Cập nhật lần cuối: 03/03/2026</p>
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
                <p className="text-sm text-green-700">24 giờ sau khi nhận hàng</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Bảo vệ người mua</span>
                </div>
                <p className="text-sm text-blue-700">Escrow 3 ngày tự động release</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Hỗ trợ</span>
                </div>
                <p className="text-sm text-purple-700">Hotline 0879.06.2222</p>
              </div>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                Điều kiện hoàn tiền
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-800 mb-2">Được hoàn tiền 100% khi:</p>
                    <ul className="text-sm text-green-700 space-y-2">
                      <li>• Tài khoản/sản phẩm không đúng mô tả (sai level, sai thông tin, thiếu tính năng đã cam kết)</li>
                      <li>• Tài khoản bị khóa/ban trong vòng 24 giờ sau khi mua mà không do lỗi người mua</li>
                      <li>• Tài khoản đã được bán cho người khác (duplicate)</li>
                      <li>• Seller không giao hàng trong 24 giờ cam kết</li>
                      <li>• Thông tin đăng nhập không hoạt động hoặc sai</li>
                      <li>• Seller tự nguyện đồng ý hoàn tiền</li>
                      <li>• Seller bị Admin ban vì gian lận, tiền Escrow chưa giải phóng sẽ hoàn về buyer</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-2">Không được hoàn tiền khi:</p>
                    <ul className="text-sm text-red-700 space-y-2">
                      <li>• Đã xác nhận nhận hàng thành công (bấm nút xác nhận)</li>
                      <li>• Hết thời gian khiếu nại 24 giờ mà không có lý do chính đáng</li>
                      <li>• Tài khoản bị khóa do LỖI CỦA NGƯỜI MUA (đổi thông tin, vi phạm TOS nền tảng, tự bị ban)</li>
                      <li>• Người mua hối hận sau khi mua (change of mind)</li>
                      <li>• Khiếu nại không có bằng chứng hợp lệ</li>
                      <li>• Sản phẩm dịch vụ (buff like/sub) đã được thực hiện một phần</li>
                      <li>• Gian lận, lạm dụng chính sách hoàn tiền</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 mb-2">Hoàn tiền một phần khi:</p>
                    <ul className="text-sm text-amber-700 space-y-2">
                      <li>• Sản phẩm có một số tính năng không đúng nhưng vẫn có giá trị sử dụng</li>
                      <li>• Dịch vụ buff thực hiện được một phần</li>
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
                    <p className="text-gray-600 text-sm mt-1">Vào Đơn hàng → Chi tiết → Nhấn Khiếu nại (trong 24 giờ). Chọn lý do: Không đúng mô tả / Không nhận được hàng / Tài khoản bị khóa / Khác</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Đính kèm bằng chứng</h3>
                    <p className="text-gray-600 text-sm mt-1">Cung cấp bằng chứng chi tiết: ảnh chụp màn hình, video, link kiểm tra, hoặc mô tả chi tiết vấn đề gặp phải</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Chờ Seller phản hồi</h3>
                    <p className="text-gray-600 text-sm mt-1">Seller sẽ phản hồi trong vòng 48 giờ. Nếu Seller đồng ý, tiền sẽ được hoàn ngay lập tức</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Admin can thiệp (nếu cần)</h3>
                    <p className="text-gray-600 text-sm mt-1">Nếu không đồng thuận với Seller → Admin xem xét trong 24-72 giờ</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Nhận hoàn tiền</h3>
                    <p className="text-gray-600 text-sm mt-1">Tiền hoàn về ví ngay lập tức sau khi khiếu nại được duyệt</p>
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
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50 border-b-2 border-blue-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Loại</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">Khiếu nại thông thường (seller đồng ý)</td>
                      <td className="px-4 py-3 text-gray-600">1-24 giờ</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">Khiếu nại cần Admin can thiệp</td>
                      <td className="px-4 py-3 text-gray-600">24-72 giờ</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">Hoàn tiền sau khi duyệt</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Ngay lập tức vào ví</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">Escrow tự động release (không khiếu nại)</td>
                      <td className="px-4 py-3 text-gray-600">72 giờ sau giao hàng</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">Rút tiền hoàn về ngân hàng</td>
                      <td className="px-4 py-3 text-gray-600">Không áp dụng (chỉ hoàn vào ví)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">4</span>
                Chính sách Escrow
              </h2>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <ul className="text-sm text-gray-700 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Mọi giao dịch</strong> sử dụng hệ thống Escrow để bảo vệ cả buyer và seller</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Tiền được giữ an toàn</strong> trong vòng 72 giờ kể từ khi giao hàng</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Sau 72 giờ</strong> tiền tự động release cho seller nếu không có khiếu nại</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Trong thời gian Escrow</strong>, buyer có thể mở khiếu nại bất kỳ lúc nào</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Seller không thể rút tiền Escrow</strong> khi đang có khiếu nại mở</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">5</span>
                Chính sách mã giảm giá khi hoàn tiền
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <ul className="text-sm text-gray-700 space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-purple-600 font-bold mt-0.5">•</span>
                      <span><strong>Mã giảm giá đã sử dụng</strong> KHÔNG được khôi phục khi hoàn tiền</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-purple-600 font-bold mt-0.5">•</span>
                      <span><strong>Số tiền hoàn</strong> = Số tiền thực tế đã trả (sau giảm giá)</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-2">Ví dụ cụ thể:</p>
                  <div className="bg-white p-3 rounded-lg text-sm text-gray-700 space-y-1 font-mono">
                    <p>Giá gốc: 100.000đ</p>
                    <p>Mã giảm giá: -20.000đ</p>
                    <p>Số tiền đã trả: 80.000đ</p>
                    <p className="text-green-600 font-bold pt-2">→ Hoàn tiền: 80.000đ</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Warning */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Lưu ý quan trọng</p>
                  <p className="text-sm text-amber-700 mt-2">
                    Mọi hành vi gian lận, lạm dụng chính sách đổi trả sẽ bị khóa tài khoản vĩnh viễn và không được hoàn tiền. Vui lòng kiểm tra kỹ sản phẩm trước khi xác nhận nhận hàng.
                  </p>
                  <p className="text-sm text-amber-700 mt-2">
                    <strong>Cần hỗ trợ khẩn cấp?</strong> Liên hệ Hotline <strong>0879.06.2222</strong> hoặc Email <strong>support@bachhoammo.store</strong>
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
