# Gửi email qua HTTP API (phù hợp DigitalOcean)

DigitalOcean và nhiều cloud **chặn outbound SMTP** (port 465/587). Các dịch vụ dưới đây gửi qua **HTTP API (port 443)** nên **không bị chặn**.

| Provider | Free tier | Cấu hình |
|----------|-----------|----------|
| **SendGrid** | 100 email/ngày | `EMAIL_PROVIDER=sendgrid` + `SENDGRID_API_KEY` |
| **Resend** | 100 email/ngày | `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` |
| **Brevo** (Sendinblue) | 300 email/ngày | `EMAIL_PROVIDER=brevo` + `BREVO_API_KEY` |

---

## SendGrid

---

## 1. Tạo tài khoản SendGrid

1. Đăng ký: https://signup.sendgrid.com/
2. Free tier: **100 email/ngày** miễn phí
3. Vào **Settings → API Keys** → **Create API Key**
   - Tên: `BachHoaMMO`
   - Quyền: **Full Access** hoặc **Restricted** (chỉ Mail Send)
4. Copy API Key (chỉ hiện 1 lần, lưu lại)

---

## 2. Xác minh người gửi (Sender)

SendGrid yêu cầu xác minh email/domain gửi:

- **Single Sender Verification:** Vào **Settings → Sender Authentication → Single Sender Verification** → thêm email (vd: `noreply@bachhoammo.store` hoặc Gmail của bạn) → nhận mail xác nhận và bấm link.
- Hoặc **Domain Authentication** nếu dùng domain riêng.

Email dùng ở bước này sẽ là địa chỉ "From" khi gửi (vd: `noreply@bachhoammo.store` hoặc `your@gmail.com`).

---

## 3. Cấu hình backend (.env)

Trong file `.env` của backend, thêm hoặc sửa:

```env
# Dùng SendGrid (khuyến nghị cho DigitalOcean)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@bachhoammo.store
SENDGRID_FROM_NAME=BachHoaMMO
```

- `SENDGRID_API_KEY`: API Key vừa tạo
- `SENDGRID_FROM_EMAIL`: email đã xác minh ở bước 2
- `SENDGRID_FROM_NAME`: tên hiển thị (vd: BachHoaMMO)

Nếu không set `SENDGRID_FROM_EMAIL`, backend sẽ dùng `GMAIL_USER` (nếu có).

---

## 4. Restart backend

```bash
pm2 restart mmomarket-backend
```

Log khởi động sẽ có dòng: `[Email] SendGrid API configured (HTTP, không cần mở port 465/587)`.

---

## 5. Test

Vào trang **Quên mật khẩu** → nhập email → **Gửi mã OTP**. Kiểm tra hộp thư (và thư mục Spam).

---

## So sánh nhanh

|           | Gmail SMTP     | SendGrid        |
|-----------|----------------|-----------------|
| Port      | 465, 587       | 443 (HTTP)      |
| DigitalOcean | Thường bị chặn | ✅ Không bị chặn |
| Cấu hình  | GMAIL_USER + GMAIL_APP_PASSWORD | EMAIL_PROVIDER=sendgrid + SENDGRID_API_KEY |

Nếu đã set SendGrid, backend **ưu tiên SendGrid** (khi `EMAIL_PROVIDER=sendgrid`). Để quay lại Gmail, đổi `EMAIL_PROVIDER=gmail` hoặc xóa `EMAIL_PROVIDER` và dùng `GMAIL_USER` + `GMAIL_APP_PASSWORD`.

---

## Resend (resend.com)

1. Đăng ký: https://resend.com/signup  
2. **API Keys** → Create API Key → copy key (bắt đầu bằng `re_`)  
3. **Domains** (hoặc dùng mặc định `onboarding@resend.dev` để test)

**.env:**
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=BachHoaMMO
```

---

## Brevo / Sendinblue (brevo.com)

1. Đăng ký: https://www.brevo.com/  
2. **SMTP & API** → **API Keys** → Generate → copy key  
3. **Senders** → thêm và xác minh email người gửi  

**.env:**
```env
EMAIL_PROVIDER=brevo
BREVO_API_KEY=xkeysib-xxxxxxxx
BREVO_FROM_EMAIL=noreply@yourdomain.com
BREVO_FROM_NAME=BachHoaMMO
```
