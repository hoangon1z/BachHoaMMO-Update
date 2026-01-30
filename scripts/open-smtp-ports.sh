#!/bin/bash
# Mở port 465 và 587 (outbound) để backend có thể gửi email qua Gmail SMTP
# Chạy với quyền root: sudo bash open-smtp-ports.sh

set -e

echo "=== Mở port SMTP (465, 587) cho Gmail ==="

# Kiểm tra UFW
if command -v ufw &>/dev/null; then
  echo "[UFW] Đang thêm rule cho phép outbound 465, 587..."
  ufw allow out 465/tcp comment 'SMTP SSL (Gmail)'
  ufw allow out 587/tcp comment 'SMTP Submission (Gmail)'
  ufw status numbered
  echo "[UFW] Nếu đã thay đổi, chạy: ufw reload"
  # ufw reload  # Bỏ comment nếu muốn reload ngay
else
  echo "UFW không tìm thấy."
fi

# Nếu dùng firewalld (CentOS/RHEL)
if command -v firewall-cmd &>/dev/null; then
  echo "[firewalld] Đang thêm rule..."
  firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="465" protocol="tcp" direction="outbound" accept'
  firewall-cmd --permanent --add-rich-rule='rule family="ipv4" port port="587" protocol="tcp" direction="outbound" accept'
  firewall-cmd --reload
  echo "[firewalld] Đã reload."
fi

# iptables (nếu dùng trực tiếp)
if command -v iptables &>/dev/null; then
  echo "[iptables] Thêm rule outbound 465, 587..."
  iptables -A OUTPUT -p tcp --dport 465 -j ACCEPT
  iptables -A OUTPUT -p tcp --dport 587 -j ACCEPT
  echo "[iptables] Đã thêm. Lưu: iptables-save > /etc/iptables/rules.v4 (tùy distro)"
fi

echo ""
echo "=== Hoàn tất ==="
echo "Kiểm tra kết nối Gmail:"
echo "  nc -zv smtp.gmail.com 587"
echo "  nc -zv smtp.gmail.com 465"
