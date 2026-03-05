'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Shield, AlertTriangle, CreditCard, Ban, Scale, Mail, Wallet, Store, Lock, RefreshCw, Phone } from 'lucide-react';

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
          <p className="text-gray-500">Cập nhật lần cuối: Tháng 3, 2026</p>
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
                Chào mừng bạn đến với <strong>BachHoaMMO</strong> — nền tảng thương mại điện tử chuyên về sản phẩm số, tài khoản kỹ thuật số và các dịch vụ MMO (Make Money Online) hàng đầu Việt Nam. Bằng việc truy cập, đăng ký hoặc sử dụng bất kỳ dịch vụ nào của chúng tôi, bạn xác nhận đã đọc, hiểu và đồng ý chịu ràng buộc bởi toàn bộ các điều khoản và điều kiện trong tài liệu này.
              </p>
              <p>
                BachHoaMMO hoạt động với vai trò là <strong>nền tảng trung gian</strong> kết nối người mua và người bán. Chúng tôi không phải là người bán trực tiếp các sản phẩm, nhưng chúng tôi cung cấp hệ thống <strong>Escrow (giữ tiền trung gian)</strong> để đảm bảo quyền lợi cho cả hai bên trong mọi giao dịch.
              </p>
              <p>
                Điều khoản này áp dụng cho tất cả người dùng bao gồm: khách truy cập, người mua (Buyer), người bán (Seller) và quản trị viên (Admin). Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng dịch vụ của chúng tôi.
              </p>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-blue-800 text-sm"><strong>Lưu ý:</strong> Các điều khoản này có thể được cập nhật theo thời gian. Chúng tôi sẽ thông báo qua email và trên website khi có thay đổi quan trọng. Việc tiếp tục sử dụng dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa với việc bạn chấp nhận điều khoản mới.</p>
              </div>
            </div>
          </section>

          {/* Account Registration */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              2. Đăng ký và quản lý tài khoản
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>2.1. Điều kiện đăng ký:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {/* <li>Bạn phải từ <strong>18 tuổi trở lên</strong> hoặc có sự đồng ý của phụ huynh/người giám hộ hợp pháp</li> */}
                <li>Thông tin đăng ký (họ tên, email, số điện thoại) phải <strong>chính xác và cập nhật</strong></li>
                <li>Mỗi người chỉ được sở hữu <strong>một (01) tài khoản</strong>. Tạo nhiều tài khoản để gian lận sẽ bị khóa vĩnh viễn</li>
                <li>Không được sử dụng thông tin của người khác để đăng ký</li>
              </ul>
              <p className="mt-4"><strong>2.2. Bảo mật tài khoản:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bạn chịu <strong>hoàn toàn trách nhiệm</strong> về mọi hoạt động xảy ra dưới tài khoản của mình</li>
                <li>Không được chia sẻ thông tin đăng nhập cho bất kỳ ai</li>
                <li>Bật xác thực hai yếu tố (2FA) để tăng cường bảo mật</li>
                <li>Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép qua Hotline: <strong>0879.06.2222</strong></li>
                <li>BachHoaMMO sẽ <strong>không bao giờ</strong> hỏi mật khẩu hay OTP của bạn qua bất kỳ kênh nào</li>
              </ul>
              <p className="mt-4"><strong>2.3. Đình chỉ và chấm dứt tài khoản:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>BachHoaMMO có quyền tạm khóa hoặc chấm dứt tài khoản vi phạm điều khoản mà không cần báo trước</li>
                <li>Tài khoản bị chấm dứt do gian lận sẽ <strong>không được hoàn lại số dư</strong></li>
                <li>Bạn có thể yêu cầu xóa tài khoản bằng cách liên hệ hỗ trợ. Số dư còn lại sẽ được xử lý theo quy định hoàn tiền</li>
              </ul>
            </div>
          </section>

          {/* Products & Services */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              3. Sản phẩm, dịch vụ và giao dịch
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>3.1. Danh mục sản phẩm:</strong> BachHoaMMO hỗ trợ giao dịch các loại sản phẩm số bao gồm nhưng không giới hạn:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Tài khoản mạng xã hội (Facebook, TikTok, Instagram, YouTube...)</li>
                <li>Tài khoản game và vật phẩm game</li>
                <li>Tài khoản dịch vụ streaming (Netflix, Spotify...)</li>
                <li>Phần mềm, license key, công cụ MMO</li>
                <li>Dịch vụ buff tương tác mạng xã hội</li>
                <li>Các sản phẩm số hợp pháp khác</li>
              </ul>

              <p className="mt-4"><strong>3.2. Quyền và nghĩa vụ của Người mua:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Đọc kỹ mô tả, đánh giá và chính sách bảo hành của sản phẩm trước khi mua</li>
                <li>Thanh toán đầy đủ qua hệ thống ví BachHoaMMO</li>
                <li><strong>Kiểm tra và xác nhận nhận hàng trong vòng 24 giờ</strong> sau khi nhận sản phẩm</li>
                <li>Sau 72 giờ không xác nhận, hệ thống sẽ tự động xác nhận và giải phóng tiền Escrow cho seller</li>
                <li>Mở khiếu nại ngay trong vòng 24 giờ nếu sản phẩm không đúng mô tả</li>
                <li>Không sử dụng sản phẩm vào mục đích vi phạm pháp luật</li>
              </ul>

              <p className="mt-4"><strong>3.3. Quyền và nghĩa vụ của Người bán (Seller):</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Cung cấp thông tin sản phẩm <strong>chính xác, đầy đủ và trung thực</strong></li>
                <li>Giao sản phẩm đúng như mô tả, đúng thời gian cam kết (tối đa 24 giờ với sản phẩm thủ công)</li>
                <li>Hỗ trợ người mua trong suốt thời gian bảo hành đã công bố</li>
                <li>Không niêm yết sản phẩm vi phạm pháp luật Việt Nam hoặc điều khoản của BachHoaMMO</li>
                <li>Chịu <strong>phí hoa hồng 5%</strong> trên mỗi giao dịch thành công cho nền tảng</li>
                <li>Được phép tạo <strong>mã giảm giá</strong> để khuyến mãi hoặc bồi thường cho khách hàng</li>
              </ul>

              <p className="mt-4"><strong>3.4. Hệ thống Escrow (Giữ tiền trung gian):</strong></p>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                <p className="text-purple-800">Khi người mua đặt hàng, tiền thanh toán sẽ được <strong>giữ trong hệ thống Escrow</strong> của BachHoaMMO và chỉ được giải phóng cho seller sau khi:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-purple-700 text-sm">
                  <li>Người mua xác nhận đã nhận hàng và hài lòng, <strong>HOẶC</strong></li>
                  <li>Hết <strong>72 giờ (3 ngày)</strong> kể từ khi seller giao hàng mà người mua không có khiếu nại</li>
                </ul>
                <p className="text-purple-800 text-sm">Cơ chế này bảo vệ người mua khỏi gian lận và đảm bảo seller nhận được thanh toán công bằng.</p>
              </div>
            </div>
          </section>

          {/* Payment & Refund */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
              4. Thanh toán, ví tiền và rút tiền
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>4.1. Nạp tiền vào ví:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Mọi giao dịch trên BachHoaMMO đều thực hiện qua <strong>hệ thống ví nội bộ</strong></li>
                <li>Hỗ trợ nạp tiền qua: Chuyển khoản ngân hàng BIDV, MB Bank (tự động cộng tiền sau 1–5 phút)</li>
                <li>Số tiền nạp tối thiểu: <strong>10.000đ</strong> | Tối đa: <strong>100.000.000đ/lần</strong></li>
                <li>Tiền nạp vào ví không được hoàn trả thành tiền mặt ngoại trừ trường hợp đặc biệt theo quyết định của Admin</li>
                <li>Luôn nhập đúng nội dung chuyển khoản theo hướng dẫn để hệ thống tự động xác nhận</li>
              </ul>

              <p className="mt-4"><strong>4.2. Rút tiền (dành cho Seller):</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Seller được rút tiền từ số dư ví về tài khoản ngân hàng cá nhân</li>
                <li>Số tiền rút tối thiểu: <strong>50.000đ</strong> | Tối đa: <strong>50.000.000đ/lần</strong></li>
                <li><strong>Miễn phí 2 lần rút tiền đầu tiên mỗi tuần</strong> (tính theo tuần từ Thứ Hai đến Chủ Nhật)</li>
                <li>Từ lần rút thứ 3 trở đi trong tuần: áp dụng <strong>phí giao dịch theo tỷ lệ phần trăm</strong> (phí cụ thể hiển thị tại trang rút tiền)</li>
                <li>Thời gian xử lý: <strong>trong vòng 24 giờ làm việc</strong> kể từ khi yêu cầu được duyệt</li>
                <li>BachHoaMMO có quyền từ chối yêu cầu rút tiền nếu phát hiện dấu hiệu gian lận hoặc vi phạm</li>
              </ul>

              <p className="mt-4"><strong>4.3. Hoàn tiền:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hoàn tiền <strong>100% vào ví BachHoaMMO</strong> nếu khiếu nại hợp lệ được chấp thuận</li>
                <li>Tiền hoàn được cộng ngay lập tức vào số dư ví sau khi Admin xử lý</li>
                <li>Không hoàn tiền nếu người mua đã <strong>xác nhận nhận hàng thành công</strong></li>
                <li>Mã giảm giá đã sử dụng trong đơn hàng được hoàn <strong>không được khôi phục</strong> khi hoàn tiền</li>
              </ul>
            </div>
          </section>

          {/* Prohibited Items */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-600" />
              </div>
              5. Hành vi bị cấm và chế tài xử lý
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>5.1. Hành vi bị nghiêm cấm đối với tất cả người dùng:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Lừa đảo, gian lận, giả mạo thông tin trong giao dịch</li>
                <li>Sử dụng nhiều tài khoản để gian lận, lạm dụng ưu đãi hoặc thao túng đánh giá</li>
                <li>Tấn công, hack, khai thác lỗ hổng hệ thống BachHoaMMO</li>
                <li>Giao dịch ngoài nền tảng để tránh phí hoa hồng sau khi đã kết nối qua BachHoaMMO</li>
                <li>Quấy rối, đe dọa, xúc phạm, phân biệt đối xử với người dùng khác hoặc nhân viên BachHoaMMO</li>
                <li>Rửa tiền hoặc sử dụng nền tảng cho các hoạt động tài chính bất hợp pháp</li>
                <li>Spam, gửi quảng cáo không được phép, phát tán mã độc</li>
              </ul>

              <p className="mt-4"><strong>5.2. Hành vi bị cấm đối với Seller:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Đăng bán sản phẩm vi phạm pháp luật Việt Nam (tài khoản hack, phần mềm độc hại...)</li>
                <li>Mô tả sản phẩm sai sự thật, đánh lừa người mua</li>
                <li>Giao hàng không đúng với sản phẩm đã mô tả</li>
                <li>Tạo đánh giá giả mạo cho cửa hàng của mình</li>
                <li>Sử dụng mã giảm giá sai mục đích hoặc gian lận hệ thống mã giảm giá</li>
              </ul>

              <p className="mt-4"><strong>5.3. Chế tài xử lý:</strong></p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Mức độ vi phạm</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Hình thức xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="px-4 py-3 text-gray-700">Vi phạm lần đầu, nhẹ</td><td className="px-4 py-3 text-gray-600">Cảnh cáo, xóa nội dung vi phạm</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Vi phạm nhiều lần hoặc nghiêm trọng</td><td className="px-4 py-3 text-gray-600">Tạm khóa tài khoản 7–30 ngày</td></tr>
                    <tr><td className="px-4 py-3 text-gray-700">Gian lận, lừa đảo, tấn công hệ thống</td><td className="px-4 py-3 text-gray-600">Khóa tài khoản vĩnh viễn, tịch thu số dư, truy cứu pháp lý</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              6. Quyền sở hữu trí tuệ và miễn trừ trách nhiệm
            </h2>
            <div className="text-gray-600 space-y-4 leading-relaxed">
              <p><strong>6.1. Quyền sở hữu trí tuệ:</strong></p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Toàn bộ nội dung, logo, giao diện, mã nguồn của BachHoaMMO thuộc quyền sở hữu của chúng tôi</li>
                <li>Người dùng không được sao chép, phân phối, chỉnh sửa nội dung của BachHoaMMO khi chưa có sự đồng ý bằng văn bản</li>
                <li>Seller tự chịu trách nhiệm về bản quyền nội dung sản phẩm họ đăng bán</li>
              </ul>
              <p className="mt-4"><strong>6.2. Miễn trừ trách nhiệm:</strong></p>
              <p>BachHoaMMO không chịu trách nhiệm đối với:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Chất lượng, tính hợp pháp của sản phẩm do người bán cung cấp</li>
                <li>Thiệt hại phát sinh từ giao dịch được thực hiện <strong>ngoài nền tảng</strong> BachHoaMMO</li>
                <li>Mất mát tài khoản do người dùng không thực hiện đầy đủ biện pháp bảo mật</li>
                <li>Gián đoạn dịch vụ do bảo trì định kỳ, sự cố kỹ thuật hoặc nguyên nhân bất khả kháng</li>
                <li>Thay đổi chính sách của bên thứ ba ảnh hưởng đến sản phẩm đã mua (thay đổi TOS của game, mạng xã hội...)</li>
                <li>Hành động của người dùng với sản phẩm sau khi đã xác nhận nhận hàng thành công</li>
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
              <p><strong>7.1. Quy trình giải quyết:</strong></p>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Người mua mở khiếu nại', desc: 'Trong vòng 24 giờ kể từ khi nhận hàng. Cung cấp ảnh/video bằng chứng rõ ràng tại trang chi tiết đơn hàng.' },
                  { step: '2', title: 'Seller phản hồi', desc: 'Seller có 48 giờ để xem xét và phản hồi khiếu nại. Có thể đề xuất giải pháp thay thế hoặc hoàn tiền.' },
                  { step: '3', title: 'Admin can thiệp', desc: 'Nếu hai bên không đạt được thỏa thuận sau 48 giờ, Admin BachHoaMMO sẽ xem xét bằng chứng và đưa ra phán quyết.' },
                  { step: '4', title: 'Kết quả cuối cùng', desc: 'Quyết định của BachHoaMMO Admin là quyết định cuối cùng. Tiền Escrow sẽ được giải phóng theo phán quyết.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 p-3 bg-indigo-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{item.step}</div>
                    <div><p className="font-semibold text-indigo-900 text-sm">{item.title}</p><p className="text-indigo-700 text-sm mt-0.5">{item.desc}</p></div>
                  </div>
                ))}
              </div>
              <p className="mt-4"><strong>7.2. Luật áp dụng:</strong> Mọi tranh chấp phát sinh từ việc sử dụng dịch vụ BachHoaMMO sẽ được giải quyết theo <strong>pháp luật Việt Nam</strong>, tại tòa án có thẩm quyền tại TP. Hồ Chí Minh.</p>
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
              <p>Nếu bạn có thắc mắc về điều khoản dịch vụ, vui lòng liên hệ qua các kênh sau:</p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-teal-600" /><span><strong>Email hỗ trợ:</strong> support@bachhoammo.store</span></li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-teal-600" /><span><strong>Hotline:</strong> 0879.06.2222 (8:00 – 22:00 hàng ngày)</span></li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-teal-600" /><span><strong>Địa chỉ:</strong> TP. Hồ Chí Minh, Việt Nam</span></li>
              </ul>
              <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <p className="text-teal-800 text-sm">Thời gian phản hồi trung bình: <strong>dưới 2 giờ</strong> trong giờ hành chính và <strong>dưới 4 giờ</strong> ngoài giờ hành chính.</p>
              </div>
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
