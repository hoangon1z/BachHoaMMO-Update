'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Share2, Cookie, UserCheck, Bell, Mail } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Chính sách bảo mật</h1>
          <p className="text-gray-500">Cập nhật lần cuối: Tháng 1, 2026</p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              1. Tổng quan
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>
                <strong>BachHoaMMO</strong> cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn. 
                Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, chia sẻ và bảo vệ 
                thông tin của bạn khi sử dụng dịch vụ của chúng tôi.
              </p>
              <p>
                Bằng việc sử dụng BachHoaMMO, bạn đồng ý với việc thu thập và sử dụng thông tin theo 
                chính sách này.
              </p>
            </div>
          </section>

          {/* Information Collection */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              2. Thông tin chúng tôi thu thập
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>Thông tin bạn cung cấp trực tiếp:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Họ tên, email, số điện thoại khi đăng ký</li>
                <li>Thông tin thanh toán và ngân hàng</li>
                <li>Địa chỉ (nếu cần thiết)</li>
                <li>Nội dung tin nhắn, đánh giá, phản hồi</li>
                <li>Ảnh đại diện và thông tin hồ sơ</li>
              </ul>
              
              <p className="mt-6"><strong>Thông tin tự động thu thập:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Địa chỉ IP và thông tin thiết bị</li>
                <li>Loại trình duyệt và hệ điều hành</li>
                <li>Thời gian truy cập và các trang đã xem</li>
                <li>Cookie và công nghệ theo dõi tương tự</li>
                <li>Lịch sử giao dịch và hoạt động</li>
              </ul>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              3. Cách chúng tôi sử dụng thông tin
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Chúng tôi sử dụng thông tin của bạn để:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Cung cấp và vận hành dịch vụ</li>
                <li>Xử lý giao dịch và thanh toán</li>
                <li>Xác minh danh tính và ngăn chặn gian lận</li>
                <li>Gửi thông báo về đơn hàng và cập nhật dịch vụ</li>
                <li>Hỗ trợ khách hàng và giải quyết tranh chấp</li>
                <li>Cải thiện và phát triển sản phẩm</li>
                <li>Gửi thông tin marketing (nếu bạn đồng ý)</li>
                <li>Tuân thủ yêu cầu pháp lý</li>
              </ul>
            </div>
          </section>

          {/* Information Sharing */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5 text-amber-600" />
              </div>
              4. Chia sẻ thông tin
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Chúng tôi có thể chia sẻ thông tin với:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Người bán/người mua:</strong> Thông tin cần thiết để hoàn tất giao dịch</li>
                <li><strong>Đối tác thanh toán:</strong> Để xử lý thanh toán an toàn</li>
                <li><strong>Nhà cung cấp dịch vụ:</strong> Hỗ trợ vận hành (hosting, email, phân tích)</li>
                <li><strong>Cơ quan pháp luật:</strong> Khi có yêu cầu hợp pháp</li>
              </ul>
              
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-green-700 font-medium">
                  Chúng tôi KHÔNG bán thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Cookie className="w-5 h-5 text-orange-600" />
              </div>
              5. Cookie và công nghệ theo dõi
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Chúng tôi sử dụng cookie để:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Duy trì phiên đăng nhập của bạn</li>
                <li>Ghi nhớ tùy chọn và cài đặt</li>
                <li>Phân tích lưu lượng truy cập website</li>
                <li>Cải thiện trải nghiệm người dùng</li>
              </ul>
              <p className="mt-4">
                Bạn có thể tắt cookie trong cài đặt trình duyệt, nhưng điều này có thể ảnh hưởng 
                đến một số tính năng của website.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              6. Bảo mật dữ liệu
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Chúng tôi áp dụng các biện pháp bảo mật:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Mã hóa SSL/TLS cho mọi kết nối</li>
                <li>Mã hóa mật khẩu với thuật toán bcrypt</li>
                <li>Xác thực hai yếu tố (2FA) tùy chọn</li>
                <li>Giám sát và phát hiện truy cập bất thường</li>
                <li>Sao lưu dữ liệu định kỳ</li>
                <li>Hạn chế quyền truy cập nội bộ</li>
              </ul>
              <p className="mt-4">
                Tuy nhiên, không có phương thức truyền tải qua Internet nào an toàn 100%. 
                Chúng tôi không thể đảm bảo tuyệt đối về bảo mật.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-indigo-600" />
              </div>
              7. Quyền của bạn
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Bạn có quyền:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Truy cập:</strong> Xem thông tin cá nhân chúng tôi lưu trữ</li>
                <li><strong>Chỉnh sửa:</strong> Cập nhật thông tin không chính xác</li>
                <li><strong>Xóa:</strong> Yêu cầu xóa tài khoản và dữ liệu</li>
                <li><strong>Hạn chế:</strong> Giới hạn cách chúng tôi xử lý dữ liệu</li>
                <li><strong>Từ chối:</strong> Hủy đăng ký nhận email marketing</li>
                <li><strong>Di chuyển:</strong> Nhận bản sao dữ liệu của bạn</li>
              </ul>
              <p className="mt-4">
                Để thực hiện các quyền này, vui lòng liên hệ qua email: <strong>privacy@BachHoaMMO.vn</strong>
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-teal-600" />
              </div>
              8. Lưu trữ dữ liệu
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Chúng tôi lưu trữ dữ liệu của bạn trong thời gian:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Thông tin tài khoản: Đến khi bạn xóa tài khoản</li>
                <li>Lịch sử giao dịch: 5 năm theo yêu cầu pháp lý</li>
                <li>Tin nhắn và chat: 2 năm sau giao dịch cuối</li>
                <li>Log hoạt động: 1 năm</li>
              </ul>
              <p className="mt-4">
                Sau khi xóa tài khoản, một số dữ liệu có thể được giữ lại cho mục đích 
                pháp lý hoặc kinh doanh hợp pháp.
              </p>
            </div>
          </section>

          {/* Updates */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-pink-600" />
              </div>
              9. Cập nhật chính sách
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>
                Chúng tôi có thể cập nhật chính sách bảo mật theo thời gian. Khi có thay đổi quan trọng, 
                chúng tôi sẽ:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Thông báo qua email cho người dùng đã đăng ký</li>
                <li>Hiển thị thông báo trên website</li>
                <li>Cập nhật ngày "Cập nhật lần cuối" ở đầu trang</li>
              </ul>
              <p className="mt-4">
                Việc tiếp tục sử dụng dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa với 
                việc bạn chấp nhận chính sách mới.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan-600" />
              </div>
              10. Liên hệ
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Nếu bạn có câu hỏi về chính sách bảo mật, vui lòng liên hệ:</p>
              <ul className="space-y-2 ml-4">
                <li><strong>Email bảo mật:</strong> privacy@BachHoaMMO.vn</li>
                <li><strong>Email hỗ trợ:</strong> support@BachHoaMMO.vn</li>
                <li><strong>Hotline:</strong> 0123.456.789</li>
                <li><strong>Địa chỉ:</strong> TP. Hồ Chí Minh, Việt Nam</li>
              </ul>
            </div>
          </section>

          {/* Agreement */}
          <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
            <p className="text-green-800">
              Bằng việc sử dụng BachHoaMMO, bạn xác nhận đã đọc và đồng ý với Chính sách bảo mật này.
            </p>
          </div>

          {/* Related Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link 
              href="/terms" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield className="w-5 h-5" />
              Điều khoản dịch vụ
            </Link>
            <Link 
              href="/" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          © 2026 BachHoaMMO. Tất cả quyền được bảo lưu.
        </div>
      </footer>
    </div>
  );
}
