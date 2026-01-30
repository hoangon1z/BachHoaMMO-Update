# Hướng dẫn dùng Resend gửi email (Quên mật khẩu, OTP)

## Bước 1: Đăng ký Resend

1. Vào **https://resend.com** → **Sign Up**
2. Đăng ký bằng Google hoặc email
3. Xác minh email (check hộp thư, bấm link)

---

## Bước 2: Lấy API Key

1. Đăng nhập Resend → vào **API Keys** (menu bên trái)
2. Bấm **Create API Key**
3. Đặt tên (vd: `BachHoaMMO`)
4. Chọn quyền: **Sending access** (hoặc Full access)
5. Bấm **Add** → **Copy** API Key (bắt đầu bằng `re_...`)
   - **Lưu lại ngay**, Resend chỉ hiện 1 lần

---

## Bước 3: Cấu hình .env trên server

Mở file `.env` của backend, thêm hoặc sửa:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=BachHoaMMO
```

- **RESEND_API_KEY**: dán API Key vừa copy
- **RESEND_FROM_EMAIL**: 
  - Dùng `onboarding@resend.dev` = chỉ gửi **đến đúng email** bạn dùng đăng ký Resend (để test)
  - Muốn gửi đến **bất kỳ email** nào: vào Resend → **Domains** → Add domain (vd: `bachhoammo.store`) → verify DNS → sau đó đặt `RESEND_FROM_EMAIL=noreply@bachhoammo.store`

---

## Bước 4: Restart backend

```bash
pm2 restart mmomarket-backend
```

Kiểm tra log: phải thấy dòng `[Email] Resend configured`.

---

## Bước 5: Test

1. Vào trang **Quên mật khẩu**: https://bachhoammo.store/forgot-password
2. Nhập **đúng email** bạn dùng đăng ký Resend (nếu đang dùng `onboarding@resend.dev`)
3. Bấm **Gửi mã OTP**
4. Mở hộp thư (và thư mục Spam) → copy mã OTP → nhập vào trang → đổi mật khẩu

---

## Lưu ý

- **onboarding@resend.dev**: Resend chỉ cho gửi **đến** email tài khoản Resend của bạn. Muốn gửi đến user bất kỳ thì phải **thêm domain** và verify trong Resend, rồi đổi `RESEND_FROM_EMAIL=noreply@domain-cua-ban.com`.
- Free: 100 email/ngày, 3.000 email/tháng.
