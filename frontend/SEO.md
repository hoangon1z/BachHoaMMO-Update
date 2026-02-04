# Hướng dẫn SEO - BachHoaMMO

Website đã được cấu hình SEO cơ bản. Để **Google index và hiển thị** khi tìm kiếm, bạn cần làm thêm các bước sau.

---

## 1. Đã triển khai trong code

- **Meta tags**: title, description, keywords, Open Graph, Twitter Card
- **Sitemap**: `https://bachhoammo.store/sitemap.xml` (tự sinh bởi Next.js)
- **robots.txt**: `https://bachhoammo.store/robots.txt` (cho phép Google crawl trang công khai)
- **JSON-LD**: Dữ liệu có cấu trúc (WebSite, Organization) trên trang chủ
- **Canonical URL** và **metadataBase** để tránh trùng nội dung

---

## 2. Bắt buộc: Đăng ký Google Search Console

1. Truy cập: **https://search.google.com/search-console**
2. Chọn **Add property** → nhập URL: `https://bachhoammo.store`
3. Xác minh quyền sở hữu (một trong các cách):
   - **HTML tag**: Copy mã verification, thêm vào `frontend/src/app/layout.tsx` trong `metadata.verification.google` (bỏ comment và thay `"your-google-verification-code"` bằng mã thật).
   - **HTML file**: Tải file HTML và đặt vào `frontend/public/`
   - **DNS**: Thêm TXT record theo hướng dẫn (nếu bạn quản lý DNS)
4. Sau khi xác minh xong:
   - Vào **Sitemaps** → thêm: `https://bachhoammo.store/sitemap.xml` → Submit
   - Vào **URL Inspection** → nhập `https://bachhoammo.store` → **Request indexing**

---

## 3. Kiểm tra nhanh

- **Sitemap**: Mở trình duyệt: `https://bachhoammo.store/sitemap.xml`
- **robots.txt**: `https://bachhoammo.store/robots.txt`
- **Structured Data**: https://search.google.com/test/rich-results (dán URL trang chủ)

---

## 4. Lưu ý

- Google thường mất **vài ngày đến vài tuần** mới index site mới. Request indexing giúp nhanh hơn nhưng không đảm bảo ngay.
- Đảm bảo **NEXT_PUBLIC_SITE_URL** trong `.env` (production) là `https://bachhoammo.store` để sitemap và canonical đúng.
- Trang **admin, seller, cart, checkout, login...** đã được disallow trong robots.txt để không lên kết quả tìm kiếm.
