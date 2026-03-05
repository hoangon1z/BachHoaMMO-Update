'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Share2, Cookie, UserCheck, Bell, Mail, AlertCircle, CheckCircle } from 'lucide-react';

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
          <p className="text-gray-500">Cập nhật lần cuối: Tháng 3, 2026</p>
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
                <strong>BachHoaMMO</strong> là một sàn thương mại điện tử chuyên cung cấp các sản phẩm MMO (tài khoản game, tài khoản mạng xã hội, sản phẩm digital) cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn một cách tuyệt đối. Chính sách bảo mật này giải thích chi tiết cách chúng tôi thu thập, sử dụng, chia sẻ, lưu trữ và bảo vệ thông tin của bạn khi sử dụng dịch vụ của chúng tôi.
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-700 font-medium mb-2">🔒 Cam kết Pháp lý</p>
                <p className="text-sm">
                  BachHoaMMO tuân thủ <strong>Quy định bảo vệ Dữ liệu Chung (GDPR)</strong> của Liên minh Châu Âu và <strong>Luật Bảo vệ Dữ liệu Cá nhân (PDPA) của Việt Nam</strong>. Chính sách này áp dụng cho tất cả các dịch vụ, sản phẩm, và nền tảng của BachHoaMMO, bao gồm website, mobile app, và các kênh liên lạc khác.
                </p>
              </div>
              <p className="mt-4">
                Bằng việc sử dụng BachHoaMMO, bạn xác nhận đã đọc, hiểu và đồng ý với việc thu thập, sử dụng, và xử lý thông tin cá nhân của bạn theo chính sách bảo mật này.
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
              <p><strong>2.1. Thông tin định danh (Identity Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Họ tên đầy đủ</li>
                <li>Địa chỉ email chính và email dự phòng</li>
                <li>Số điện thoại di động và điện thoại cố định</li>
                <li>Ảnh đại diện / ảnh đại diện hồ sơ</li>
                <li>Thông tin tiểu sử và giới thiệu bản thân</li>
              </ul>
              
              <p className="mt-4"><strong>2.2. Thông tin tài chính (Financial Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lịch sử nạp tiền / rút tiền từ ví điện tử</li>
                <li>Chi tiết giao dịch mua/bán sản phẩm</li>
                <li>Phương thức thanh toán (BIDV, MB Bank, PayOS, v.v.)</li>
                <li>Thông tin hóa đơn và biên lai</li>
                <li><strong>QUAN TRỌNG:</strong> BachHoaMMO KHÔNG lưu trữ số thẻ tín dụng, số thẻ ghi nợ, hoặc chi tiết ngân hàng nhạy cảm. Tất cả thanh toán được xử lý qua các đối tác thanh toán an toàn được mã hóa.</li>
              </ul>

              <p className="mt-4"><strong>2.3. Thông tin kỹ thuật (Technical Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Địa chỉ IP và vị trí địa lý gần đúng</li>
                <li>Device fingerprint (dấu vân tay thiết bị)</li>
                <li>Loại, phiên bản trình duyệt, và user agent</li>
                <li>Hệ điều hành và phiên bản</li>
                <li>Độ phân giải màn hình, múi giờ, ngôn ngữ hệ thống</li>
                <li>Thông tin cookie, session token, và local storage</li>
              </ul>

              <p className="mt-4"><strong>2.4. Thông tin hành vi (Behavioral Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Các trang web đã xem và thời lượng truy cập</li>
                <li>Sản phẩm yêu thích, đã lưu, hoặc đã xem</li>
                <li>Lịch sử tìm kiếm và bộ lọc đã sử dụng</li>
                <li>Tỷ lệ nhấp chuột (click-through rate)</li>
                <li>Thời gian đăng nhập và đăng xuất</li>
              </ul>

              <p className="mt-4"><strong>2.5. Thông tin liên lạc (Communication Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nội dung tin nhắn với người bán và admin</li>
                <li>Email, Telegram, và các cuộc trò chuyện khác</li>
                <li>Đánh giá sản phẩm, bình luận, và phản hồi</li>
                <li>Báo cáo vấn đề hoặc khiếu nại</li>
              </ul>

              <p className="mt-4"><strong>2.6. Thông tin xác minh người bán (Seller Verification)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Chứng minh nhân dân (CMND) hoặc Căn cước công dân (CCCD) nếu được yêu cầu</li>
                <li>Thông tin ngân hàng để xác minh danh tính (chỉ 3-4 chữ số cuối cùng)</li>
                <li>Ảnh chân dung để xác minh khuôn mặt (nếu cần thiết)</li>
                <li><strong>QUAN TRỌNG:</strong> Các tài liệu nhạy cảm này được mã hóa end-to-end và được lưu trữ riêng biệt khỏi dữ liệu chính.</li>
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
              <p className="font-medium">Chúng tôi sử dụng thông tin của bạn cho các mục đích sau:</p>
              
              <p><strong>3.1. Xử lý giao dịch và quản lý ví</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Tạo và quản lý tài khoản người dùng của bạn</li>
                <li>Xử lý thanh toán, nạp tiền, rút tiền từ ví điện tử</li>
                <li>Theo dõi số dư ví và lịch sử giao dịch</li>
                <li>Xử lý đơn hàng mua/bán sản phẩm</li>
                <li>Tạo hóa đơn và biên lai giao dịch</li>
              </ul>

              <p className="mt-4"><strong>3.2. Xác minh danh tính và phòng chống gian lận</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Xác minh danh tính của bạn khi đăng ký hoặc thực hiện giao dịch lớn</li>
                <li>Ngăn chặn gian lận, giả mạo, và trộm cắp danh tính</li>
                <li>Phát hiện và điều tra các hoạt động bất lợi hoặc vi phạm</li>
                <li>So khớp thông tin với các cơ sở dữ liệu chống gian lận</li>
              </ul>

              <p className="mt-4"><strong>3.3. Phát hiện hành vi bất thường (Anomaly Detection)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Phân tích mô hình hành vi để phát hiện hoạt động bất thường</li>
                <li>Sử dụng machine learning để nhận diện các giao dịch đáng ngờ</li>
                <li>Cảnh báo về đăng nhập từ thiết bị hoặc địa điểm mới</li>
                <li>Yêu cầu xác thực bổ sung nếu cần thiết</li>
              </ul>

              <p className="mt-4"><strong>3.4. Gửi thông báo đơn hàng và cập nhật</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gửi xác nhận đơn hàng qua email</li>
                <li>Cập nhật trạng thái giao dịch (đang xử lý, hoàn thành, v.v.)</li>
                <li>Gửi thông báo qua Telegram (nếu bạn bật tính năng này)</li>
                <li>Thông báo về vấn đề hoặc thay đổi tài khoản</li>
                <li>Gửi hóa đơn và biên lai điện tử</li>
              </ul>

              <p className="mt-4"><strong>3.5. Cải thiện thuật toán đề xuất sản phẩm</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Phân tích lịch sử tìm kiếm và mua hàng của bạn</li>
                <li>Cải thiện khuyến nghị sản phẩm cá nhân hóa</li>
                <li>Tối ưu hóa trải nghiệm tìm kiếm</li>
                <li>Phát hiện xu hướng và sở thích của người dùng</li>
              </ul>

              <p className="mt-4"><strong>3.6. Báo cáo thuế theo yêu cầu pháp luật</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lập báo cáo doanh thu cho cơ quan thuế Việt Nam</li>
                <li>Tuân thủ các quy định kế toán và kiểm toán</li>
                <li>Lưu giữ dữ liệu giao dịch theo yêu cầu của pháp luật</li>
              </ul>

              <p className="mt-4"><strong>3.7. Marketing và truyền thông (chỉ với sự đồng ý của bạn)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gửi email về khuyến mại, sản phẩm mới, và thông báo đặc biệt</li>
                <li>Gửi SMS hoặc Telegram về ưu đãi giới hạn</li>
                <li>Tiếp cận thông qua các kênh truyền thông xã hội (nếu bạn theo dõi tài khoản của chúng tôi)</li>
                <li><strong>QUAN TRỌNG:</strong> Bạn có thể hủy đăng ký nhận email marketing bất cứ lúc nào bằng cách nhấp vào liên kết &quot;Hủy đăng ký&quot; hoặc liên hệ với chúng tôi.</li>
              </ul>

              <p className="mt-4"><strong>3.8. Tuân thủ pháp luật và yêu cầu thực thi</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Tuân thủ các luật lệ và quy định áp dụng</li>
                <li>Phản hồi các yêu cầu hợp pháp từ cơ quan thực thi pháp luật</li>
                <li>Bảo vệ quyền lợi, quyền riêng tư, và an toàn của chúng tôi và người dùng</li>
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
              <p className="font-medium">Chúng tôi có thể chia sẻ thông tin của bạn trong những trường hợp sau:</p>
              
              <p><strong>4.1. Đối tác thanh toán</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>BIDV (Ngân hàng Đầu tư và Phát triển Việt Nam):</strong> Để xử lý thanh toán an toàn qua cổng thanh toán trực tuyến</li>
                <li><strong>MB Bank (Ngân hàng Quân đội):</strong> Để xử lý chuyển khoản và thanh toán</li>
                {/* <li><strong>PayOS:</strong> Để xử lý thanh toán, nạp tiền, và rút tiền</li> */}
                <li>Các đối tác thanh toán khác được thêm trong tương lai sẽ được công khai</li>
                <li><strong>QUAN TRỌNG:</strong> Chúng tôi KHÔNG bao giờ chia sẻ chi tiết thẻ tín dụng hoặc mật khẩu với bất kỳ bên thứ ba nào. Tất cả giao dịch đều được mã hóa SSL/TLS end-to-end.</li>
              </ul>

              <p className="mt-4"><strong>4.2. Dịch vụ email và thông báo</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Email Service Provider (SendGrid, Amazon SES, v.v.):</strong> Để gửi email xác nhận, thông báo giao dịch, và các thông báo khác</li>
                <li><strong>Telegram:</strong> Nếu bạn bật tính năng nhận thông báo qua Telegram, chúng tôi sẽ chia sẻ thông tin giao dịch cần thiết với Telegram Bot API</li>
                <li>Chúng tôi không chia sẻ mật khẩu hoặc thông tin nhạy cảm khác với các dịch vụ này</li>
              </ul>

              <p className="mt-4"><strong>4.3. Người bán và người mua</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Để hoàn tất giao dịch, chúng tôi sẽ chia sẻ thông tin liên hệ cần thiết (họ tên, email, số điện thoại) giữa người bán và người mua</li>
                <li>Chúng tôi sẽ không chia sẻ dữ liệu ngân hàng hoặc thông tin thanh toán chính xác</li>
              </ul>

              <p className="mt-4"><strong>4.4. Cơ quan thuế và pháp luật</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Khi có yêu cầu hợp pháp từ cơ quan thuế Việt Nam, chúng tôi sẽ cung cấp báo cáo doanh thu và lịch sử giao dịch</li>
                <li>Khi có lệnh từ cơ quan cảnh sát, viện kiểm sát, hoặc tòa án, chúng tôi sẽ tuân thủ để hỗ trợ điều tra</li>
                <li>Chúng tôi sẽ thông báo cho bạn về các yêu cầu pháp lý này ngoại trừ khi bị cấm bởi luật pháp</li>
              </ul>

              <p className="mt-4"><strong>4.5. Nhà cung cấp dịch vụ hỗ trợ vận hành</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Hosting & Cloud Services:</strong> AWS, Google Cloud, hoặc các nhà cung cấp khác để lưu trữ dữ liệu</li>
                <li><strong>Database & Analytics:</strong> Để phân tích hành vi người dùng và cải thiện dịch vụ</li>
                <li><strong>Security & Monitoring:</strong> Để phòng chống gian lận và giám sát an toàn</li>
                <li>Tất cả các nhà cung cấp này phải tuân thủ các tiêu chuẩn bảo mật và bảo vệ dữ liệu tương tự như BachHoaMMO</li>
              </ul>

              <p className="mt-4"><strong>4.6. Liên kết/M&A và chuyển giao kinh doanh</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nếu BachHoaMMO được mua lại, sáp nhập, hoặc chuyển giao, thông tin của bạn có thể được chuyển giao như một phần của tài sản kinh doanh</li>
                <li>Chúng tôi sẽ thông báo cho bạn về sự thay đổi này và cơ hội để chọn không tham gia</li>
              </ul>

              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Chúng tôi TUYỆT ĐỐI KHÔNG bán thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại, tiếp thị, hoặc bất kỳ mục đích nào khác mà không có sự đồng ý rõ ràng của bạn.
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
              <p><strong>5.1. Cookie</strong></p>
              <p>Chúng tôi sử dụng cookie (các tệp nhỏ lưu trữ trên thiết bị của bạn) để:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Duy trì phiên đăng nhập của bạn và xác thực danh tính</li>
                <li>Ghi nhớ tùy chọn, cài đặt ngôn ngữ, và tùy chỉnh giao diện</li>
                <li>Phân tích lưu lượng truy cập website và hành vi người dùng</li>
                <li>Cải thiện trải nghiệm người dùng và cá nhân hóa nội dung</li>
                <li>Phát hiện gian lận và hoạt động đáng ngờ</li>
              </ul>

              <p className="mt-4"><strong>5.2. LocalStorage</strong></p>
              <p>Chúng tôi sử dụng localStorage (bộ nhớ cục bộ của trình duyệt) để:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lưu trữ giỏ hàng của bạn (sản phẩm chưa mua)</li>
                <li>Lưu trữ session token để duy trì trạng thái đăng nhập</li>
                <li>Lưu trữ tùy chọn theme (sáng/tối) và giao diện người dùng</li>
                <li>Lưu trữ các bộ lọc tìm kiếm gần đây</li>
                <li>Lưu trữ các thông tin tạm thời khác không nhạy cảm</li>
              </ul>

              <p className="mt-4"><strong>5.3. Loại Cookie</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Cookie Cần thiết:</strong> Cần thiết để vận hành trang web, không thể tắt được</li>
                <li><strong>Cookie Hiệu năng:</strong> Giúp chúng tôi hiểu cách bạn sử dụng trang web</li>
                <li><strong>Cookie Hành vi:</strong> Theo dõi hành vi của bạn để cung cấp nội dung được cá nhân hóa</li>
                <li><strong>Cookie Marketing:</strong> Được sử dụng để hiển thị quảng cáo có liên quan (chỉ khi bạn đồng ý)</li>
              </ul>

              <p className="mt-4"><strong>5.4. Kiểm soát Cookie</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có thể quản lý cài đặt cookie trong trình duyệt (Chrome, Firefox, Safari, Edge, v.v.)</li>
                <li>Bạn có thể tắt cookie hoặc xóa cookie hiện tại, nhưng điều này có thể ảnh hưởng đến tính năng của website</li>
                <li>Bạn có thể sử dụng chế độ &quot;Private/Incognito&quot; để duyệt web mà không để lại cookie</li>
                <li>Nếu tắt cookie cần thiết, bạn có thể không thể đăng nhập hoặc sử dụng một số tính năng</li>
              </ul>

              <p className="mt-4"><strong>5.5. Công nghệ theo dõi khác</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Pixel Tracker:</strong> Chúng tôi sử dụng pixel ẩn để theo dõi xem email đã được mở hay chưa</li>
                <li><strong>Web Beacon:</strong> Để theo dõi quá trình chuyển đổi (conversion tracking)</li>
                <li><strong>Analytics:</strong> Google Analytics hoặc công cụ phân tích tương tự để hiểu hành vi người dùng</li>
              </ul>

              <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-orange-700 text-sm">
                  <strong>Ghi chú:</strong> BachHoaMMO không bao giờ lưu trữ thông tin nhạy cảm (mật khẩu, số thẻ, v.v.) trong cookie hoặc localStorage. Tất cả thông tin nhạy cảm được lưu trữ an toàn trên máy chủ và truyền tải qua kết nối mã hóa.
                </p>
              </div>
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
              <p className="font-medium">Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức:</p>

              <p><strong>6.1. Mã hóa (Encryption)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>SSL/TLS:</strong> Tất cả kết nối giữa trình duyệt của bạn và máy chủ BachHoaMMO được mã hóa bằng giao thức HTTPS với TLS 1.2 trở lên</li>
                <li><strong>End-to-End Encryption:</strong> Dữ liệu nhạy cảm (CCCD, hình ảnh xác minh) được mã hóa end-to-end</li>
                <li><strong>Database Encryption:</strong> Dữ liệu trong cơ sở dữ liệu được mã hóa ở mức hàng (row-level encryption)</li>
              </ul>

              <p className="mt-4"><strong>6.2. Xác thực (Authentication)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>JWT Token:</strong> Chúng tôi sử dụng JWT (JSON Web Token) cho xác thực an toàn, token sẽ hết hạn sau một khoảng thời gian</li>
                <li><strong>Password Hashing:</strong> Mật khẩu được băm bằng thuật toán bcrypt với salt ngẫu nhiên, không bao giờ được lưu trữ dưới dạng văn bản thuần</li>
                <li><strong>Multi-Factor Authentication (2FA/MFA):</strong> Người dùng có thể bật xác thực hai yếu tố qua email, SMS, hoặc ứng dụng authenticator</li>
              </ul>

              <p className="mt-4"><strong>6.3. Phòng chống gian lận</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Device Fingerprinting:</strong> Chúng tôi tạo một &quot;dấu vân tay&quot; của thiết bị dựa trên IP, user agent, và các thông tin khác để phát hiện hoạt động bất thường</li>
                <li><strong>Rate Limiting:</strong> Giới hạn số lần đăng nhập thất bại, yêu cầu API, để ngăn chặn tấn công brute force</li>
                <li><strong>WAF (Web Application Firewall):</strong> Bảo vệ chống lại các cuộc tấn công phổ biến như SQL injection, XSS, CSRF</li>
                <li><strong>Anomaly Detection:</strong> Sử dụng machine learning để phát hiện hoạt động lạ (đăng nhập từ quốc gia mới, giao dịch lớn bất thường, v.v.)</li>
              </ul>

              <p className="mt-4"><strong>6.4. Kiểm toán và ghi nhật ký (Audit & Logging)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Audit Log:</strong> Tất cả các hành động của admin (xem dữ liệu, sửa đổi, xóa) được ghi nhật ký chi tiết</li>
                <li><strong>Access Log:</strong> Tất cả đăng nhập, giao dịch, và hoạt động cơ bản được ghi lại với dấu thời gian</li>
                <li><strong>Security Log:</strong> Các sự kiện bảo mật như xác thực thất bại, thay đổi quyền, được ghi lại</li>
                <li>Log được lưu giữ an toàn và được bảo vệ khỏi sửa đổi hoặc xóa trái phép</li>
              </ul>

              <p className="mt-4"><strong>6.5. Sao lưu và phục hồi (Backup & Recovery)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Sao lưu hàng ngày:</strong> Dữ liệu được sao lưu hoàn toàn mỗi ngày</li>
                <li><strong>Sao lưu tăng dần:</strong> Những thay đổi được sao lưu mỗi giờ</li>
                <li><strong>Sao lưu địa lý:</strong> Sao lưu được lưu trữ tại nhiều vị trí địa lý để phòng chống thảm họa</li>
                <li><strong>Thử nghiệm phục hồi:</strong> Chúng tôi thường xuyên kiểm tra khả năng phục hồi từ sao lưu</li>
              </ul>

              <p className="mt-4"><strong>6.6. Kiểm soát truy cập (Access Control)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>RBAC (Role-Based Access Control):</strong> Nhân viên chỉ được truy cập dữ liệu cần thiết cho công việc của họ</li>
                <li><strong>Nguyên tắc Least Privilege:</strong> Mỗi tài khoản được cấp quyền tối thiểu cần thiết</li>
                <li><strong>Phân tách nhiệm vụ:</strong> Các hoạt động quan trọng yêu cầu phê duyệt của nhiều người</li>
              </ul>

              <p className="mt-4"><strong>6.7. Đánh giá bảo mật</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Penetration Testing:</strong> Chúng tôi thường xuyên kiểm tra bảo mật bằng các chuyên gia bên ngoài</li>
                <li><strong>Vulnerability Assessment:</strong> Quét định kỳ để phát hiện lỗ hổng bảo mật</li>
                <li><strong>Code Review:</strong> Tất cả mã được đánh giá bảo mật trước khi triển khai</li>
              </ul>

              <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-red-700 font-medium flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý quan trọng:</strong> Mặc dù BachHoaMMO áp dụng các biện pháp bảo mật tiên tiến, không có hệ thống nào an toàn 100%. Chúng tôi khuyến khích bạn sử dụng mật khẩu mạnh, bật 2FA, và không chia sẻ thông tin đăng nhập với bất kỳ ai.
                  </span>
                </p>
              </div>
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
              <p className="font-medium">Theo luật GDPR và PDPA, bạn có các quyền sau đây:</p>

              <p><strong>7.1. Quyền truy cập dữ liệu (Right to Access)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có quyền yêu cầu xem những thông tin cá nhân nào mà BachHoaMMO đang lưu trữ về bạn</li>
                <li>Chúng tôi sẽ cung cấp tất cả dữ liệu của bạn ở định dạng dễ đọc (PDF hoặc Excel)</li>
              </ul>

              <p className="mt-4"><strong>7.2. Quyền chỉnh sửa dữ liệu (Right to Rectification)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nếu thông tin của bạn không chính xác hoặc không đầy đủ, bạn có quyền yêu cầu chúng tôi cập nhật</li>
                <li>Bạn có thể chỉnh sửa một số thông tin trực tiếp trong hồ sơ của bạn</li>
                <li>Với các thông tin khác, liên hệ với chúng tôi để cập nhật</li>
              </ul>

              <p className="mt-4"><strong>7.3. Quyền xóa dữ liệu (Right to be Forgotten / Right to Erasure)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có quyền yêu cầu xóa tài khoản và tất cả dữ liệu cá nhân của bạn</li>
                <li>Ngoại lệ: Chúng tôi sẽ giữ lại dữ liệu giao dịch theo yêu cầu pháp lý (5 năm)</li>
                <li>Sau khi xóa, không thể khôi phục dữ liệu này</li>
              </ul>

              <p className="mt-4"><strong>7.4. Quyền hạn chế xử lý dữ liệu (Right to Restrict Processing)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có thể yêu cầu chúng tôi dừng xử lý dữ liệu của bạn trong những trường hợp nhất định</li>
                <li>Ví dụ: Nếu bạn không đồng ý với tính chính xác của dữ liệu, bạn có thể yêu cầu hạn chế xử lý cho đến khi chúng tôi xác minh</li>
              </ul>

              <p className="mt-4"><strong>7.5. Quyền phản đối xử lý dữ liệu (Right to Object)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có quyền phản đối xử lý dữ liệu cho mục đích marketing</li>
                <li>Bạn có thể hủy đăng ký nhận email, SMS, hoặc Telegram thông báo marketing bất cứ lúc nào</li>
                <li>Bạn có thể phản đối xử lý dữ liệu cho các mục đích khác (ngoài những mục đích cần thiết để cung cấp dịch vụ)</li>
              </ul>

              <p className="mt-4"><strong>7.6. Quyền di chuyển dữ liệu (Right to Data Portability)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có quyền nhận một bản sao của tất cả dữ liệu cá nhân của bạn ở định dạng chuẩn, có thể di chuyển được</li>
                <li>Bạn có thể yêu cầu chuyển dữ liệu này sang một nhà cung cấp dịch vụ khác</li>
              </ul>

              <p className="mt-4"><strong>7.7. Quyền yêu cầu xem log hoạt động (Right to Request Activity Log)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn có quyền yêu cầu xem tất cả hoạt động trên tài khoản của bạn (đăng nhập, giao dịch, thay đổi thông tin)</li>
                <li>Chúng tôi sẽ cung cấp danh sách chi tiết với dấu thời gian và địa chỉ IP</li>
                <li>Điều này giúp bạn phát hiện hoạt động bất thường hoặc trái phép</li>
              </ul>

              <p className="mt-4"><strong>7.8. Quyền không bị phân biệt đối xử</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>BachHoaMMO sẽ không từ chối dịch vụ hoặc tính phí cao hơn nếu bạn thực hiện các quyền trên</li>
              </ul>

              <p className="mt-4"><strong>Cách thực hiện các quyền của bạn:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Gửi yêu cầu qua email: <strong>privacy@bachhoammo.store</strong></li>
                <li>Hoặc: <strong>support@bachhoammo.store</strong></li>
                <li>Hoặc gọi hotline: <strong>0879.06.2222</strong> (8:00-22:00 hàng ngày)</li>
                <li><strong>Thời hạn phản hồi:</strong> Chúng tôi cam kết phản hồi trong vòng <strong>30 ngày làm việc</strong> kể từ khi nhận được yêu cầu</li>
                <li>Bạn cần cung cấp thông tin xác minh danh tính (email, số điện thoại) để chứng minh bạn là chủ tài khoản</li>
              </ul>

              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-indigo-700 text-sm">
                  <strong>Lưu ý:</strong> Nếu bạn không hài lòng với cách chúng tôi xử lý dữ liệu cá nhân của bạn, bạn có quyền nộp đơn khiếu nại lên cơ quan bảo vệ dữ liệu địa phương hoặc cơ quan chủ quản tại Việt Nam.
                </p>
              </div>
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
              <p className="font-medium">Chúng tôi lưu trữ dữ liệu của bạn cho những khoảng thời gian cụ thể sau:</p>

              <p><strong>8.1. Thông tin tài khoản (Account Information)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lưu trữ đến khi bạn xóa tài khoản</li>
                <li>Nếu bạn không hoạt động trong 12 tháng, chúng tôi sẽ gửi cảnh báo trước khi xóa tài khoản</li>
                <li>Sau khi xóa tài khoản, thông tin sẽ được xóa hoàn toàn sau 30 ngày</li>
              </ul>

              <p className="mt-4"><strong>8.2. Lịch sử giao dịch (Transaction History)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 5 năm</strong> theo Luật Kế toán Việt Nam và yêu cầu thuế</li>
                <li>Bao gồm: chi tiết mua/bán, số tiền, ngày tháng, người liên quan</li>
                <li>Lý do: Để tuân thủ pháp luật kế toán và phục vụ kiểm toán thuế</li>
                <li>Hết hạn 5 năm, dữ liệu sẽ được xóa hoàn toàn</li>
              </ul>

              <p className="mt-4"><strong>8.3. Tin nhắn và trò chuyện (Messages & Chat)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 2 năm</strong> kể từ giao dịch cuối cùng giữa hai bên</li>
                <li>Bao gồm: Tin nhắn trong cuộc trò chuyện với seller/admin, đánh giá sản phẩm</li>
                <li>Lý do: Để giải quyết tranh chấp, phục vụ hỗ trợ khách hàng</li>
                <li>Bạn có thể xóa tin nhắn cá nhân bất cứ lúc nào</li>
              </ul>

              <p className="mt-4"><strong>8.4. Log bảo mật (Security Logs)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 1 năm</strong></li>
                <li>Bao gồm: Đăng nhập, đăng xuất, thay đổi mật khẩu, xác thực 2FA</li>
                <li>Lý do: Để phát hiện hoạt động bất thường và phòng chống gian lận</li>
              </ul>

              <p className="mt-4"><strong>8.5. Log truy cập (Access Logs)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 90 ngày</strong></li>
                <li>Bao gồm: IP address, thời gian truy cập, trang được xem, hoạt động</li>
                <li>Lý do: Để phân tích hiệu năng, phát hiện lỗi, theo dõi an toàn</li>
              </ul>

              <p className="mt-4"><strong>8.6. Dữ liệu sao lưu (Backup Data)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 90 ngày</strong></li>
                <li>Sau 90 ngày, sao lưu cũ sẽ được xóa và chỉ giữ lại sao lưu mới nhất</li>
                <li>Lý do: Để phục hồi dữ liệu khi có sự cố</li>
              </ul>

              <p className="mt-4"><strong>8.7. Dữ liệu xác minh Seller (Seller Verification Data)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: Toàn bộ thời gian seller hoạt động + 2 năm</strong></li>
                <li>Bao gồm: Ảnh CCCD/CMND, ảnh chân dung, thông tin ngân hàng (mã hóa)</li>
                <li>Lý do: Để tuân thủ yêu cầu pháp luật về xác minh danh tính seller</li>
              </ul>

              <p className="mt-4"><strong>8.8. Dữ liệu hành vi người dùng (Behavioral Data)</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Lưu trữ: 1 năm</strong></li>
                <li>Bao gồm: Tìm kiếm, sản phẩm xem, yêu thích, bộ lọc đã sử dụng</li>
                <li>Lý dao: Để cải thiện khuyến nghị sản phẩm</li>
              </ul>

              <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <p className="text-teal-700 font-medium mb-2">📋 Bảng tóm tắt thời gian lưu trữ:</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-teal-200">
                      <th className="text-left py-2 px-2 font-semibold">Loại dữ liệu</th>
                      <th className="text-left py-2 px-2 font-semibold">Thời gian lưu trữ</th>
                    </tr>
                  </thead>
                  <tbody className="text-teal-800">
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Thông tin tài khoản</td>
                      <td className="py-2 px-2">Đến khi xóa tài khoản</td>
                    </tr>
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Lịch sử giao dịch</td>
                      <td className="py-2 px-2">5 năm (theo luật)</td>
                    </tr>
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Tin nhắn/Chat</td>
                      <td className="py-2 px-2">2 năm</td>
                    </tr>
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Log bảo mật</td>
                      <td className="py-2 px-2">1 năm</td>
                    </tr>
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Log truy cập</td>
                      <td className="py-2 px-2">90 ngày</td>
                    </tr>
                    <tr className="border-b border-teal-100">
                      <td className="py-2 px-2">Dữ liệu sao lưu</td>
                      <td className="py-2 px-2">90 ngày</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Dữ liệu hành vi</td>
                      <td className="py-2 px-2">1 năm</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm">
                <strong>Lưu ý:</strong> Sau khi hết thời gian lưu trữ, dữ liệu sẽ được xóa hoàn toàn hoặc ẩn danh hóa. Tuy nhiên, một số dữ liệu có thể được giữ lại nếu:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm mt-2">
                <li>Cần thiết để tuân thủ pháp luật</li>
                <li>Cần thiết để giải quyết tranh chấp pháp lý</li>
                <li>Bạn có một khoản nợ chưa thanh toán</li>
              </ul>
            </div>
          </section>

          {/* Children */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              9. Trẻ em (Under 18)
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p className="font-medium">BachHoaMMO có chính sách nghiêm ngặt về bảo vệ trẻ em:</p>

              <p><strong>9.1. Yêu cầu tuổi tối thiểu</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>BachHoaMMO không dành cho người dưới 18 tuổi</li>
                <li>Bằng cách đăng ký, bạn xác nhận rằng bạn ít nhất 18 tuổi</li>
                <li>Ở một số nước, tuổi tối thiểu có thể cao hơn - vui lòng kiểm tra pháp luật địa phương</li>
              </ul>

              <p className="mt-4"><strong>9.2. Phát hiện người dùng dưới 18 tuổi</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nếu chúng tôi phát hiện hoặc nghi ngờ rằng một người dùng dưới 18 tuổi, chúng tôi sẽ</li>
                <li>Xóa tài khoản của họ ngay lập tức</li>
                <li>Xóa tất cả dữ liệu cá nhân được lưu trữ (ngoại trừ dữ liệu giao dịch yêu cầu pháp lý)</li>
                <li>Gửi thông báo cho email hoặc số điện thoại được đăng ký</li>
              </ul>

              <p className="mt-4"><strong>9.3. Sự chồng chéo với phụ huynh</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nếu phụ huynh hoặc người giám hộ phát hiện rằng trẻ em của họ đã tạo tài khoản, vui lòng liên hệ với chúng tôi ngay</li>
                <li>Email: <strong>support@bachhoammo.store</strong> hoặc <strong>privacy@bachhoammo.store</strong></li>
                <li>Hotline: <strong>0879.06.2222</strong> (8:00-22:00 hàng ngày)</li>
                <li>Chúng tôi sẽ xóa tài khoản và dữ liệu ngay lập tức</li>
              </ul>

              <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-rose-700 font-medium flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý với phụ huynh:</strong> BachHoaMMO khuyến khích phụ huynh theo dõi hoạt động trực tuyến của trẻ em. Nếu bạn lo ngại về quyền riêng tư hoặc an toàn của trẻ em, vui lòng liên hệ với chúng tôi.
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Updates */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-pink-600" />
              </div>
              10. Cập nhật chính sách
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p>
                Chúng tôi có thể cập nhật chính sách bảo mật theo thời gian. Khi có thay đổi quan trọng, 
                chúng tôi sẽ:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Thông báo qua email cho người dùng đã đăng ký</li>
                <li>Hiển thị thông báo trên website</li>
                <li>Cập nhật ngày &quot;Cập nhật lần cuối&quot; ở đầu trang</li>
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
              11. Liên hệ
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p className="font-medium">Nếu bạn có bất kỳ câu hỏi, lo ngại, hoặc muốn thực hiện quyền của mình theo chính sách bảo mật này, vui lòng liên hệ với chúng tôi:</p>

              <p><strong>📧 Email</strong></p>
              <ul className="space-y-2 ml-4">
                <li><strong>Bảo mật dữ liệu & Quyền riêng tư:</strong> privacy@bachhoammo.store</li>
                <li><strong>Hỗ trợ khách hàng:</strong> support@bachhoammo.store</li>
                <li><strong>Khiếu nại về dữ liệu:</strong> complaints@bachhoammo.store</li>
              </ul>

              <p className="mt-4"><strong>☎️ Hotline</strong></p>
              <ul className="space-y-2 ml-4">
                <li><strong>Số điện thoại:</strong> <strong className="text-blue-600">0879.06.2222</strong></li>
                <li><strong>Giờ làm việc:</strong> 8:00 - 22:00 (hàng ngày, bao gồm cả ngày lễ)</li>
                <li><strong>Dịch vụ:</strong> Hỗ trợ trực tiếp, khiếu nại, yêu cầu quyền riêng tư</li>
              </ul>

              <p className="mt-4"><strong>📍 Địa chỉ</strong></p>
              <ul className="space-y-2 ml-4">
                <li><strong>Thành phố:</strong> TP. Hồ Chí Minh, Việt Nam</li>
                <li><strong>Quốc gia:</strong> Cộng hòa Xã hội chủ nghĩa Việt Nam</li>
                <li><strong>Lưu ý:</strong> Chúng tôi chủ yếu giao tiếp qua email và hotline. Nếu bạn cần gửi tài liệu, vui lòng liên hệ email trước.</li>
              </ul>

              <p className="mt-4"><strong>⏱️ Thời gian phản hồi</strong></p>
              <ul className="space-y-2 ml-4">
                <li><strong>Yêu cầu thông thường:</strong> 1-2 ngày làm việc</li>
                <li><strong>Yêu cầu phức tạp:</strong> 5-10 ngày làm việc</li>
                <li><strong>Yêu cầu quyền riêng tư (GDPR/PDPA):</strong> Tối đa 30 ngày làm việc</li>
              </ul>

              <p className="mt-4"><strong>💬 Kênh liên lạc khác</strong></p>
              <ul className="space-y-2 ml-4">
                <li><strong>Chat trực tiếp:</strong> Trên website BachHoaMMO (nếu có)</li>
                <li><strong>Messenger:</strong> BachHoaMMO Official (nếu có)</li>
                <li><strong>Form yêu cầu:</strong> Tại trang <strong>/contact</strong> hoặc <strong>/support</strong></li>
              </ul>

              <div className="mt-6 p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                <p className="text-cyan-700 font-medium mb-3">📋 Khi liên hệ với chúng tôi, vui lòng cung cấp:</p>
                <ul className="space-y-2 ml-4 text-cyan-700">
                  <li>📌 Email hoặc số điện thoại được đăng ký</li>
                  <li>📌 Tên đầy đủ hoặc tên tài khoản</li>
                  <li>📌 Chi tiết về vấn đề hoặc yêu cầu của bạn</li>
                  <li>📌 Bằng chứng danh tính (nếu yêu cầu)</li>
                </ul>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                <strong>Lưu ý:</strong> Để bảo vệ quyền riêng tư của bạn, chúng tôi sẽ yêu cầu xác minh danh tính trước khi cung cấp thông tin nhạy cảm hoặc thực hiện bất kỳ thay đổi nào với tài khoản của bạn.
              </p>
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
