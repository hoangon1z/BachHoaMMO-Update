/**
 * Seed script to migrate hardcoded policy pages into CMS.
 * Run: npx ts-node prisma/seed-pages.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pages = [
    {
        slug: 'terms',
        title: 'Điều khoản dịch vụ',
        description: 'Điều khoản sử dụng dịch vụ BachHoaMMO',
        content: `
<h2>1. Giới thiệu</h2>
<p>Chào mừng bạn đến với <strong>BachHoaMMO</strong>. Bằng việc truy cập và sử dụng website của chúng tôi, bạn đồng ý tuân thủ và chịu ràng buộc bởi các điều khoản và điều kiện sau đây.</p>
<p>BachHoaMMO là nền tảng trung gian kết nối người mua và người bán các sản phẩm số, tài khoản kỹ thuật số, và các dịch vụ liên quan. Chúng tôi không phải là người bán trực tiếp mà đóng vai trò là bên thứ ba đảm bảo giao dịch an toàn.</p>

<h2>2. Đăng ký tài khoản</h2>
<p>Để sử dụng dịch vụ, bạn cần đăng ký tài khoản với thông tin chính xác:</p>
<ul>
  <li>Thông tin đăng ký phải chính xác và cập nhật</li>
  <li>Mỗi người chỉ được sở hữu một tài khoản</li>
  <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập</li>
  <li>Thông báo ngay cho chúng tôi nếu phát hiện truy cập trái phép</li>
</ul>

<h2>3. Sản phẩm và giao dịch</h2>
<p><strong>Đối với Người mua:</strong></p>
<ul>
  <li>Kiểm tra kỹ thông tin sản phẩm trước khi mua</li>
  <li>Thanh toán đầy đủ trước khi nhận sản phẩm</li>
  <li>Xác nhận đơn hàng trong vòng 24 giờ sau khi nhận</li>
  <li>Khiếu nại trong thời gian bảo hành nếu có vấn đề</li>
</ul>
<p><strong>Đối với Người bán:</strong></p>
<ul>
  <li>Cung cấp thông tin sản phẩm chính xác, đầy đủ</li>
  <li>Giao sản phẩm đúng như mô tả trong thời gian cam kết</li>
  <li>Hỗ trợ người mua trong thời gian bảo hành</li>
  <li>Không bán sản phẩm vi phạm pháp luật</li>
</ul>

<h2>4. Thanh toán và hoàn tiền</h2>
<p><strong>Thanh toán:</strong></p>
<ul>
  <li>Nạp tiền vào ví BachHoaMMO trước khi mua hàng</li>
  <li>Hỗ trợ nhiều phương thức: chuyển khoản ngân hàng, ví điện tử</li>
  <li>Tiền được giữ trong hệ thống Escrow cho đến khi giao dịch hoàn tất</li>
</ul>
<p><strong>Hoàn tiền:</strong></p>
<ul>
  <li>Hoàn tiền 100% nếu sản phẩm không đúng mô tả</li>
  <li>Hoàn tiền trong vòng 1-3 ngày làm việc sau khi được duyệt</li>
  <li>Không hoàn tiền nếu người mua đã xác nhận nhận hàng</li>
  <li>Khiếu nại phải có bằng chứng rõ ràng (ảnh, video)</li>
</ul>

<h2>5. Hành vi bị cấm</h2>
<p>Các hành vi sau đây bị nghiêm cấm trên BachHoaMMO:</p>
<ul>
  <li>Lừa đảo, gian lận trong giao dịch</li>
  <li>Bán sản phẩm vi phạm pháp luật Việt Nam</li>
  <li>Sử dụng nhiều tài khoản để gian lận</li>
  <li>Spam, quảng cáo không được phép</li>
  <li>Tấn công, hack hệ thống</li>
  <li>Giao dịch ngoài nền tảng để tránh phí</li>
  <li>Quấy rối, xúc phạm người dùng khác</li>
</ul>
<p><strong>Vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn.</strong></p>

<h2>6. Miễn trừ trách nhiệm</h2>
<p>BachHoaMMO không chịu trách nhiệm đối với:</p>
<ul>
  <li>Chất lượng sản phẩm do người bán cung cấp</li>
  <li>Thiệt hại do giao dịch ngoài nền tảng</li>
  <li>Mất mát do người dùng không bảo mật tài khoản</li>
  <li>Gián đoạn dịch vụ do bảo trì hoặc sự cố kỹ thuật</li>
  <li>Thay đổi chính sách của bên thứ ba (game, dịch vụ...)</li>
</ul>

<h2>7. Giải quyết tranh chấp</h2>
<p>Quy trình giải quyết tranh chấp:</p>
<ol>
  <li>Người mua mở khiếu nại trong vòng 24 giờ</li>
  <li>Người bán có 48 giờ để phản hồi</li>
  <li>Nếu không thỏa thuận được, BachHoaMMO sẽ can thiệp</li>
  <li>Quyết định của BachHoaMMO là cuối cùng</li>
</ol>
<p>Mọi tranh chấp sẽ được giải quyết theo pháp luật Việt Nam.</p>

<h2>8. Liên hệ</h2>
<p>Nếu bạn có thắc mắc về điều khoản dịch vụ, vui lòng liên hệ:</p>
<ul>
  <li><strong>Email:</strong> support@bachhoammo.store</li>
</ul>
<p><em>Bằng việc sử dụng dịch vụ của BachHoaMMO, bạn xác nhận đã đọc, hiểu và đồng ý với tất cả các điều khoản trên.</em></p>
    `.trim(),
    },
    {
        slug: 'privacy',
        title: 'Chính sách bảo mật',
        description: 'Chính sách bảo mật thông tin của BachHoaMMO',
        content: `
<h2>1. Thu thập thông tin</h2>
<p>Chúng tôi thu thập các thông tin sau khi bạn sử dụng dịch vụ:</p>
<ul>
  <li>Thông tin đăng ký: tên, email, số điện thoại</li>
  <li>Thông tin giao dịch: lịch sử mua bán, thanh toán</li>
  <li>Thông tin kỹ thuật: IP, trình duyệt, thiết bị</li>
</ul>

<h2>2. Sử dụng thông tin</h2>
<p>Thông tin được sử dụng để:</p>
<ul>
  <li>Cung cấp và cải thiện dịch vụ</li>
  <li>Xác thực và bảo mật tài khoản</li>
  <li>Giải quyết tranh chấp</li>
  <li>Gửi thông báo quan trọng về dịch vụ</li>
</ul>

<h2>3. Bảo mật thông tin</h2>
<p>Chúng tôi cam kết bảo vệ thông tin của bạn bằng:</p>
<ul>
  <li>Mã hóa dữ liệu truyền tải (SSL/TLS)</li>
  <li>Hệ thống bảo mật nhiều lớp</li>
  <li>Không chia sẻ thông tin cho bên thứ ba ngoại trừ yêu cầu pháp luật</li>
</ul>

<h2>4. Liên hệ</h2>
<p>Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ qua email: <strong>support@bachhoammo.store</strong></p>
    `.trim(),
    },
    {
        slug: 'refund-policy',
        title: 'Chính sách đổi trả',
        description: 'Chính sách đổi trả và hoàn tiền của BachHoaMMO',
        content: `
<h2>1. Điều kiện đổi trả / Hoàn tiền</h2>
<p><strong>Được hoàn tiền khi:</strong></p>
<ul>
  <li>Tài khoản không đúng mô tả (sai level, sai thông tin...)</li>
  <li>Tài khoản bị khóa/ban ngay sau khi mua</li>
  <li>Tài khoản đã được bán cho người khác</li>
  <li>Seller không giao hàng trong thời gian quy định</li>
  <li>Thông tin đăng nhập không hoạt động</li>
</ul>
<p><strong>Không được hoàn tiền khi:</strong></p>
<ul>
  <li>Đã xác nhận nhận hàng thành công</li>
  <li>Hết thời gian khiếu nại (24h)</li>
  <li>Tài khoản bị khóa do lỗi người mua</li>
  <li>Khách hàng cố tình gian lận</li>
</ul>

<h2>2. Quy trình khiếu nại</h2>
<ol>
  <li><strong>Mở khiếu nại:</strong> Vào chi tiết đơn hàng → Nhấn "Khiếu nại" → Chọn lý do và mô tả chi tiết</li>
  <li><strong>Cung cấp bằng chứng:</strong> Chụp màn hình, video minh chứng vấn đề gặp phải</li>
  <li><strong>Chờ xử lý:</strong> Seller sẽ phản hồi trong 24h. Nếu không thỏa thuận được, Admin sẽ can thiệp</li>
  <li><strong>Nhận kết quả:</strong> Hoàn tiền về số dư tài khoản nếu khiếu nại hợp lệ</li>
</ol>

<h2>3. Thời gian xử lý</h2>
<table>
  <thead><tr><th>Loại yêu cầu</th><th>Thời gian xử lý</th></tr></thead>
  <tbody>
    <tr><td>Khiếu nại thông thường</td><td>24-48 giờ</td></tr>
    <tr><td>Khiếu nại cần Admin can thiệp</td><td>48-72 giờ</td></tr>
    <tr><td>Hoàn tiền sau khi duyệt</td><td>Ngay lập tức</td></tr>
  </tbody>
</table>

<p><strong>Lưu ý:</strong> Mọi hành vi gian lận, lạm dụng chính sách đổi trả sẽ bị khóa tài khoản vĩnh viễn.</p>
    `.trim(),
    },
    {
        slug: 'payment-guide',
        title: 'Hướng dẫn thanh toán',
        description: 'Hướng dẫn nạp tiền và thanh toán trên BachHoaMMO',
        content: `
<h2>1. Nạp tiền vào ví</h2>
<p>Trước khi mua hàng, bạn cần nạp tiền vào ví BachHoaMMO:</p>
<ol>
  <li>Đăng nhập vào tài khoản</li>
  <li>Vào mục <strong>Ví tiền</strong> → <strong>Nạp tiền</strong></li>
  <li>Nhập số tiền cần nạp</li>
  <li>Chọn phương thức thanh toán và thực hiện</li>
  <li>Tiền sẽ được cộng vào ví sau khi xác nhận</li>
</ol>

<h2>2. Phương thức thanh toán</h2>
<ul>
  <li><strong>Chuyển khoản ngân hàng:</strong> Chuyển khoản theo thông tin hiển thị, tiền sẽ được cộng tự động hoặc sau khi admin duyệt</li>
  <li><strong>Ví điện tử:</strong> Thanh toán qua các ví điện tử được hỗ trợ</li>
</ul>

<h2>3. Thanh toán đơn hàng</h2>
<p>Khi mua sản phẩm, số tiền sẽ được trừ từ ví của bạn. Tiền được giữ trong hệ thống Escrow và chỉ chuyển cho người bán sau khi bạn xác nhận nhận hàng thành công.</p>

<h2>4. Lưu ý</h2>
<ul>
  <li>Kiểm tra kỹ thông tin trước khi nạp tiền</li>
  <li>Giữ biên lai/ảnh chụp giao dịch để đối chiếu khi cần</li>
  <li>Liên hệ Admin nếu gặp vấn đề trong quá trình nạp tiền</li>
</ul>
    `.trim(),
    },
    {
        slug: 'shopping-guide',
        title: 'Hướng dẫn mua hàng',
        description: 'Hướng dẫn mua hàng trên BachHoaMMO',
        content: `
<h2>1. Tìm sản phẩm</h2>
<ul>
  <li>Duyệt theo danh mục hoặc sử dụng thanh tìm kiếm</li>
  <li>Lọc theo giá, đánh giá, người bán</li>
  <li>Đọc kỹ mô tả sản phẩm trước khi mua</li>
</ul>

<h2>2. Đặt hàng</h2>
<ol>
  <li>Chọn sản phẩm và biến thể (nếu có)</li>
  <li>Nhấn <strong>"Mua ngay"</strong> hoặc <strong>"Thêm vào giỏ"</strong></li>
  <li>Kiểm tra đơn hàng và xác nhận thanh toán</li>
  <li>Hệ thống sẽ tự động giao hàng hoặc seller sẽ giao thủ công</li>
</ol>

<h2>3. Nhận hàng</h2>
<ul>
  <li><strong>Giao tự động:</strong> Thông tin sản phẩm hiển thị ngay sau khi thanh toán</li>
  <li><strong>Giao thủ công:</strong> Seller sẽ giao hàng qua chat hoặc email trong thời gian cam kết</li>
</ul>

<h2>4. Xác nhận đơn hàng</h2>
<p>Sau khi nhận hàng, hãy kiểm tra sản phẩm và nhấn <strong>"Xác nhận nhận hàng"</strong> nếu mọi thứ OK. Nếu có vấn đề, hãy mở khiếu nại trong vòng 24 giờ.</p>

<h2>5. Đánh giá</h2>
<p>Sau khi hoàn tất đơn hàng, bạn có thể đánh giá sản phẩm và người bán để giúp cộng đồng.</p>
    `.trim(),
    },
];

async function main() {
    console.log('Seeding CMS pages...');
    for (const page of pages) {
        const existing = await prisma.page.findUnique({ where: { slug: page.slug } });
        if (existing) {
            console.log(`  ⏭  "${page.slug}" already exists, skipping`);
        } else {
            await prisma.page.create({ data: page });
            console.log(`  ✅ Created "${page.slug}"`);
        }
    }
    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
