# Mở port 465/587 cho Gmail SMTP

> **DigitalOcean (và nhiều cloud) thường chặn outbound SMTP.** Nếu bạn dùng DigitalOcean, nên dùng **SendGrid** thay vì Gmail SMTP. Xem [README-SENDGRID.md](./README-SENDGRID.md).

Backend gửi email **ra ngoài** (outbound) tới Gmail SMTP. Cần cho phép server kết nối **đi** tới `smtp.gmail.com` trên port **465** (SMTPS) và **587** (Submission).

---

## 1. Server VPS/VM (UFW – Ubuntu/Debian)

```bash
# Cho phép outbound 465, 587
sudo ufw allow out 465/tcp comment 'Gmail SMTP SSL'
sudo ufw allow out 587/tcp comment 'Gmail SMTP Submission'

# Xem trạng thái
sudo ufw status numbered

# Áp dụng
sudo ufw reload
```

**Lưu ý:** UFW mặc định thường **cho phép** outbound. Nếu vẫn không gửi được email, kiểm tra tiếp phần Cloud / iptables bên dưới.

---

## 2. Cloud (AWS / GCP / Azure)

Firewall trên **cloud** (Security Group / VPC / NSG) thường **chỉ** cấu hình **inbound**. Outbound thường mặc định cho phép.

- **AWS:** Security Group → Outbound rules → thêm rule: Type **Custom TCP**, Port **465** và **587**, Destination **0.0.0.0/0** (hoặc chỉ IP Gmail nếu bạn giới hạn).
- **GCP:** VPC → Firewall → rule **egress** (outbound) cho port 465, 587.
- **Azure:** NSG → Outbound security rules → thêm rule cho port 465, 587.

---

## 3. Chạy script có sẵn

Trong repo đã có script:

```bash
cd /var/BachHoaMMO/BachHoaMMO/scripts
sudo bash open-smtp-ports.sh
```

Script sẽ thử thêm rule cho UFW / firewalld / iptables tùy công cụ đang dùng.

---

## 4. Kiểm tra kết nối tới Gmail

Sau khi mở port, chạy trên server:

```bash
# Port 587 (STARTTLS)
nc -zv smtp.gmail.com 587

# Port 465 (SSL)
nc -zv smtp.gmail.com 465
```

Nếu thấy `Connection to smtp.gmail.com port 587 [tcp/submission] succeeded!` (và tương tự với 465) là đã thông.

---

## 5. Restart backend và test quên mật khẩu

```bash
pm2 restart mmomarket-backend
```

Sau đó vào trang **Quên mật khẩu**, nhập email và bấm **Gửi mã OTP**. Kiểm tra hộp thư (và spam) để xem có nhận được email OTP không.
