'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, AlertTriangle, CreditCard, Ban, Scale, Mail } from 'lucide-react';

export default function TermsPage() {
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
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Điều khoản dịch vụ</h1>
          <p className="text-gray-500">Cập nhật lần cuối: Tháng 1, 2026</p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              1. Giới thiệu
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>
                Chào mừng bạn đến với <strong>BachHoaMMO</strong>. Bằng việc truy cập và sử dụng website của chúng tôi, 
                bạn đồng ý tuân thủ và chịu ràng buộc bởi các điều khoản và điều kiện sau đây.
              </p>
              <p>
                BachHoaMMO là nền tảng trung gian kết nối người mua và người bán các sản phẩm số, tài khoản kỹ thuật số, 
                và các dịch vụ liên quan. Chúng tôi không phải là người bán trực tiếp mà đóng vai trò là bên thứ ba 
                đảm bảo giao dịch an toàn.
              </p>
            </div>
          </section>

          {/* Account Registration */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              2. Đăng ký tài khoản
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Để sử dụng dịch vụ, bạn cần đăng ký tài khoản với thông tin chính xác:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {/* <li>Bạn phải từ 18 tuổi trở lên hoặc có sự đồng ý của phụ huynh/người giám hộ</li> */}
                <li>Thông tin đăng ký phải chính xác và cập nhật</li>
                <li>Mỗi người chỉ được sở hữu một tài khoản</li>
                <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập</li>
                <li>Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép</li>
              </ul>
            </div>
          </section>

          {/* Products & Services */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              3. Sản phẩm và giao dịch
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>Đối với Người mua:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Kiểm tra kỹ thông tin sản phẩm trước khi mua</li>
                <li>Thanh toán đầy đủ trước khi nhận sản phẩm</li>
                <li>Xác nhận đơn hàng trong vòng 24 giờ sau khi nhận</li>
                <li>Khiếu nại trong thời gian bảo hành nếu có vấn đề</li>
              </ul>
              
              <p className="mt-6"><strong>Đối với Người bán:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Cung cấp thông tin sản phẩm chính xác, đầy đủ</li>
                <li>Giao sản phẩm đúng như mô tả trong thời gian cam kết</li>
                <li>Hỗ trợ người mua trong thời gian bảo hành</li>
                <li>Không bán sản phẩm vi phạm pháp luật</li>
              </ul>
            </div>
          </section>

          {/* Payment & Refund */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-600" />
              </div>
              4. Thanh toán và hoàn tiền
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>Thanh toán:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nạp tiền vào ví BachHoaMMO trước khi mua hàng</li>
                <li>Hỗ trợ nhiều phương thức: chuyển khoản ngân hàng, ví điện tử</li>
                <li>Tiền được giữ trong hệ thống Escrow cho đến khi giao dịch hoàn tất</li>
              </ul>
              
              <p className="mt-6"><strong>Hoàn tiền:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hoàn tiền 100% nếu sản phẩm không đúng mô tả</li>
                <li>Hoàn tiền trong vòng 1-3 ngày làm việc sau khi được duyệt</li>
                <li>Không hoàn tiền nếu người mua đã xác nhận nhận hàng</li>
                <li>Khiếu nại phải có bằng chứng rõ ràng (ảnh, video)</li>
              </ul>
            </div>
          </section>

          {/* Prohibited Items */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              5. Hành vi bị cấm
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Các hành vi sau đây bị nghiêm cấm trên BachHoaMMO:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lừa đảo, gian lận trong giao dịch</li>
                <li>Bán sản phẩm vi phạm pháp luật Việt Nam</li>
                <li>Sử dụng nhiều tài khoản để gian lận</li>
                <li>Spam, quảng cáo không được phép</li>
                <li>Tấn công, hack hệ thống</li>
                <li>Giao dịch ngoài nền tảng để tránh phí</li>
                <li>Quấy rối, xúc phạm người dùng khác</li>
              </ul>
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-red-700 font-medium">
                  Vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              6. Miễn trừ trách nhiệm
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>BachHoaMMO không chịu trách nhiệm đối với:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Chất lượng sản phẩm do người bán cung cấp</li>
                <li>Thiệt hại do giao dịch ngoài nền tảng</li>
                <li>Mất mát do người dùng không bảo mật tài khoản</li>
                <li>Gián đoạn dịch vụ do bảo trì hoặc sự cố kỹ thuật</li>
                <li>Thay đổi chính sách của bên thứ ba (game, dịch vụ...)</li>
              </ul>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-indigo-600" />
              </div>
              7. Giải quyết tranh chấp
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Quy trình giải quyết tranh chấp:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Người mua mở khiếu nại trong vòng 24 giờ</li>
                <li>Người bán có 48 giờ để phản hồi</li>
                <li>Nếu không thỏa thuận được, BachHoaMMO sẽ can thiệp</li>
                <li>Quyết định của BachHoaMMO là cuối cùng</li>
              </ol>
              <p className="mt-4">
                Mọi tranh chấp sẽ được giải quyết theo pháp luật Việt Nam.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              8. Liên hệ
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>Nếu bạn có thắc mắc về điều khoản dịch vụ, vui lòng liên hệ:</p>
              <ul className="space-y-2 ml-4">
                <li><strong>Email:</strong> support@BachHoaMMO.vn</li>
                <li><strong>Hotline:</strong> </li>
                <li><strong>Địa chỉ:</strong> TP. Hồ Chí Minh, Việt Nam</li>
              </ul>
            </div>
          </section>

          {/* Agreement */}
          <div className="bg-blue-50 rounded-2xl p-6 text-center border border-blue-100">
            <p className="text-blue-800">
              Bằng việc sử dụng dịch vụ của BachHoaMMO, bạn xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản trên.
            </p>
          </div>

          {/* Related Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link 
              href="/privacy" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield className="w-5 h-5" />
              Chính sách bảo mật
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
