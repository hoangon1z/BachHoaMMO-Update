# 📦 Hướng dẫn cài đặt BachHoaMMO - Chi tiết đầy đủ

Tài liệu này hướng dẫn chi tiết từng bước cách cài đặt và deploy dự án BachHoaMMO.

> ⚠️ **Lưu ý quan trọng:** Dự án hiện đang sử dụng SQLite cho development. Nếu muốn dùng PostgreSQL cho production, cần thay đổi trong `prisma/schema.prisma`.

---

## 📋 Mục lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Cài đặt trên Ubuntu VPS](#-cài-đặt-trên-ubuntu-vps)
3. [Cấu hình Environment chi tiết](#-cấu-hình-environment-chi-tiết)
4. [Setup Database](#-setup-database)
5. [Build và Deploy](#-build-và-deploy)
6. [Cấu hình PM2](#-cấu-hình-pm2)
7. [Cấu hình Nginx + SSL](#-cấu-hình-nginx--ssl)
8. [Các lệnh deploy thường dùng](#-các-lệnh-deploy-thường-dùng)
9. [Cập nhật code mới](#-cập-nhật-code-mới)
10. [Backup Database](#-backup-database)
11. [Troubleshooting](#-troubleshooting)

---

## 💻 Yêu cầu hệ thống

### Hardware tối thiểu
| Thông số | Tối thiểu | Khuyến nghị |
|----------|-----------|-------------|
| RAM | 2GB | 4GB+ |
| CPU | 1 core | 2 cores+ |
| Storage | 20GB SSD | 40GB+ SSD |
| Bandwidth | 1TB/month | Unlimited |

### Software bắt buộc
| Software | Version | Ghi chú |
|----------|---------|---------|
| Node.js | 18.x hoặc 20.x LTS | **Bắt buộc** |
| npm | 9.x+ | Đi kèm Node.js |
| Git | 2.x+ | Để clone code |
| PM2 | 5.x+ | Process manager |
| Nginx | 1.18+ | Reverse proxy |

### Database (tuỳ chọn)
| Database | Mục đích | Bắt buộc? |
|----------|----------|-----------|
| SQLite | Main database (mặc định) | ✅ Có sẵn |
| MongoDB | Chat system | ⚠️ Nếu dùng chat |
| Redis | Caching/Sessions | ⚠️ Nếu cần cache |

---

## 🚀 Cài đặt trên Ubuntu VPS

### Bước 1: Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### Bước 2: Cài đặt Node.js 20.x

```bash
# Thêm NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Cài đặt Node.js
sudo apt-get install -y nodejs

# Kiểm tra version
node -v  # v20.x.x
npm -v   # 10.x.x
```

### Bước 3: Cài đặt PM2 và Nginx

```bash
# PM2 - Process Manager
sudo npm install -g pm2

# Nginx - Reverse Proxy
sudo apt-get install -y nginx

# Certbot - SSL Certificate
sudo apt-get install -y certbot python3-certbot-nginx
```

### Bước 4: Tạo thư mục và clone code

```bash
# Tạo thư mục
sudo mkdir -p /var/BachHoaMMO
sudo chown -R $USER:$USER /var/BachHoaMMO
cd /var/BachHoaMMO

# Clone repository
git clone https://github.com/hoangon1z/BachHoaMMO-Update.git BachHoaMMO
cd BachHoaMMO
```

### Bước 5: Cài đặt dependencies

```bash
# Backend
cd /var/BachHoaMMO/BachHoaMMO/backend
npm install

# Frontend
cd /var/BachHoaMMO/BachHoaMMO/frontend
npm install
```

---

## ⚙️ Cấu hình Environment chi tiết

### Backend: `/var/BachHoaMMO/BachHoaMMO/backend/.env`

```bash
# Tạo file .env từ example
cp .env.example .env
nano .env
```

**Nội dung file `.env` đầy đủ:**

```env
# ============================================
# MMO MARKET - BACKEND CONFIGURATION
# ============================================

# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV="production"
PORT=3001

# ============================================
# DATABASE - SQLite (mặc định)
# ============================================
DATABASE_URL="file:./database.sqlite"

# DATABASE - PostgreSQL (nếu muốn dùng)
# DATABASE_URL="postgresql://user:password@localhost:5432/bachhoammo?schema=public"

# ============================================
# MONGODB (cho chat system)
# ============================================
MONGODB_URL="mongodb://localhost:27017/bachhoammo_chat"

# ============================================
# REDIS (cho caching - tuỳ chọn)
# ============================================
REDIS_URL="redis://localhost:6379"

# ============================================
# JWT AUTHENTICATION
# Tạo secret key ngẫu nhiên: openssl rand -base64 32
# ============================================
JWT_SECRET="thay-bang-key-ngau-nhien-it-nhat-32-ky-tu"
JWT_EXPIRES_IN="7d"

# ============================================
# CORS - Domain được phép truy cập
# ============================================
CORS_ORIGIN="https://bachhoammo.store"

# ============================================
# FRONTEND URL (cho redirects)
# ============================================
FRONTEND_URL="https://bachhoammo.store"

# ============================================
# PAYOS PAYMENT GATEWAY
# Đăng ký tại: https://my.payos.vn
# ============================================
PAYOS_CLIENT_ID="your-client-id"
PAYOS_API_KEY="your-api-key"
PAYOS_CHECKSUM_KEY="your-checksum-key"
PAYOS_BASE_URL="https://bachhoammo.store"

# ============================================
# EMAIL SERVICE - Resend (khuyến nghị)
# Đăng ký tại: https://resend.com
# ============================================
EMAIL_PROVIDER=resend
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@bachhoammo.store"
RESEND_FROM_NAME="BachHoaMMO"

# EMAIL SERVICE - Gmail (thay thế)
# GMAIL_USER="your-email@gmail.com"
# GMAIL_APP_PASSWORD="your-16-digit-app-password"

# ============================================
# ENCRYPTION KEY (32 ký tự)
# Tạo: openssl rand -hex 16
# ============================================
ENCRYPTION_KEY="thay-bang-encryption-key-32-char"

# ============================================
# TELEGRAM BOT (tuỳ chọn)
# Tạo bot tại: @BotFather trên Telegram
# ============================================
TELEGRAM_BOT_TOKEN="your-bot-token"
```

### Frontend: `/var/BachHoaMMO/BachHoaMMO/frontend/.env.local`

```bash
nano .env.local
```

**Nội dung file `.env.local`:**

```env
# ============================================
# API URL - Backend internal (cùng server)
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:3001

# ============================================
# SOCKET URL - Backend WebSocket (external)
# Dùng cho client browser kết nối
# ============================================
NEXT_PUBLIC_SOCKET_URL=https://api.bachhoammo.store

# ============================================
# SITE URL - Domain chính (cho SEO)
# ============================================
NEXT_PUBLIC_SITE_URL=https://bachhoammo.store

# ============================================
# ENCRYPTION KEY (phải giống backend)
# ============================================
NEXT_PUBLIC_ENCRYPTION_KEY="thay-bang-encryption-key-32-char"
```

---

## 🗄️ Setup Database

### SQLite (Mặc định - Đơn giản nhất)

```bash
cd /var/BachHoaMMO/BachHoaMMO/backend

# Generate Prisma Client
npx prisma generate

# Tạo database và tables
npx prisma db push

# (Tuỳ chọn) Xem database với Prisma Studio
npx prisma studio
```

### MongoDB (Cho chat system)

```bash
# Cài đặt MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# Khởi động MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Kiểm tra
mongosh --eval "db.version()"
```

---

## 🔨 Build và Deploy

### Build Backend

```bash
cd /var/BachHoaMMO/BachHoaMMO/backend

# Build TypeScript -> JavaScript
npm run build

# Kiểm tra thư mục dist đã được tạo
ls -la dist/
```

### Build Frontend

```bash
cd /var/BachHoaMMO/BachHoaMMO/frontend

# Xoá cache cũ (quan trọng!)
rm -rf .next

# Build production
npm run build

# Kiểm tra build thành công
ls -la .next/
```

---

## 📦 Cấu hình PM2

### Tạo file ecosystem.config.js

```bash
nano /var/BachHoaMMO/BachHoaMMO/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'mmomarket-backend',
      cwd: '/var/BachHoaMMO/BachHoaMMO/backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/root/.pm2/logs/mmomarket-backend-error.log',
      out_file: '/root/.pm2/logs/mmomarket-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'mmomarket-frontend',
      cwd: '/var/BachHoaMMO/BachHoaMMO/frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/root/.pm2/logs/mmomarket-frontend-error.log',
      out_file: '/root/.pm2/logs/mmomarket-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### Khởi động với PM2

```bash
cd /var/BachHoaMMO/BachHoaMMO

# Khởi động tất cả
pm2 start ecosystem.config.js

# Lưu config
pm2 save

# Auto-start khi reboot
pm2 startup
# Chạy lệnh mà PM2 đưa ra
```

### Các lệnh PM2 thường dùng

```bash
# Xem trạng thái
pm2 status

# Xem logs
pm2 logs                          # Tất cả logs
pm2 logs mmomarket-backend        # Chỉ backend
pm2 logs mmomarket-frontend       # Chỉ frontend
pm2 logs --lines 100              # 100 dòng gần nhất

# Restart
pm2 restart all                   # Tất cả
pm2 restart mmomarket-backend     # Chỉ backend
pm2 restart mmomarket-frontend    # Chỉ frontend

# Stop
pm2 stop all

# Delete (xoá khỏi PM2)
pm2 delete all

# Monitor realtime
pm2 monit
```

---

## 🌐 Cấu hình Nginx + SSL

### Tạo config Nginx

```bash
sudo nano /etc/nginx/sites-available/bachhoammo
```

```nginx
# ========================================
# Frontend - bachhoammo.store
# ========================================
server {
    listen 80;
    server_name bachhoammo.store www.bachhoammo.store;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bachhoammo.store www.bachhoammo.store;

    # SSL sẽ được Certbot thêm tự động ở đây

    # Logging
    access_log /var/log/nginx/bachhoammo-access.log;
    error_log /var/log/nginx/bachhoammo-error.log;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# ========================================
# Backend API - api.bachhoammo.store
# ========================================
server {
    listen 80;
    server_name api.bachhoammo.store;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.bachhoammo.store;

    # SSL sẽ được Certbot thêm tự động

    # Tăng body size cho upload file
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/api-bachhoammo-access.log;
    error_log /var/log/nginx/api-bachhoammo-error.log;

    # Proxy to NestJS Backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # WebSocket support
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Static files (uploads)
    location /uploads {
        alias /var/BachHoaMMO/BachHoaMMO/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }
}
```

### Enable config và kiểm tra

```bash
# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/bachhoammo /etc/nginx/sites-enabled/

# Xoá default config (nếu có)
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Cài đặt SSL với Certbot

```bash
# Lấy SSL certificate
sudo certbot --nginx -d bachhoammo.store -d www.bachhoammo.store -d api.bachhoammo.store

# Nhập email và đồng ý terms

# Test auto-renew
sudo certbot renew --dry-run
```

---

## � Các lệnh deploy thường dùng

### Deploy nhanh (khi update code)

```bash
# 1. Pull code mới
cd /var/BachHoaMMO/BachHoaMMO
git pull origin main

# 2. Cài dependencies mới (nếu có)
cd backend && npm install
cd ../frontend && npm install

# 3. Build backend
cd ../backend
npm run build

# 4. Build frontend (xoá cache trước!)
cd ../frontend
rm -rf .next
npm run build

# 5. Restart PM2
pm2 restart all

# 6. Kiểm tra
pm2 status
pm2 logs --lines 20
```

### Script deploy tự động

```bash
# Tạo file deploy.sh
nano /var/BachHoaMMO/BachHoaMMO/deploy.sh
```

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

cd /var/BachHoaMMO/BachHoaMMO

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing backend dependencies..."
cd backend
npm install --production

echo "🔨 Building backend..."
npm run build

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🗑️ Cleaning frontend cache..."
rm -rf .next

echo "🔨 Building frontend..."
npm run build

echo "♻️ Restarting PM2..."
pm2 restart all

echo "✅ Deployment completed!"
pm2 status
```

```bash
# Cấp quyền thực thi
chmod +x /var/BachHoaMMO/BachHoaMMO/deploy.sh

# Chạy deploy
./deploy.sh
```

---

## 💾 Backup Database

### Backup SQLite

```bash
# Tạo thư mục backup
mkdir -p /var/backups/bachhoammo

# Backup database
cp /var/BachHoaMMO/BachHoaMMO/backend/prisma/database.sqlite \
   /var/backups/bachhoammo/database-$(date +%Y%m%d-%H%M%S).sqlite

# Backup uploads
tar -czf /var/backups/bachhoammo/uploads-$(date +%Y%m%d-%H%M%S).tar.gz \
   /var/BachHoaMMO/BachHoaMMO/backend/uploads/
```

### Backup tự động với Cron

```bash
# Mở crontab
crontab -e

# Thêm dòng này (backup hàng ngày lúc 3:00 AM)
0 3 * * * cp /var/BachHoaMMO/BachHoaMMO/backend/prisma/database.sqlite /var/backups/bachhoammo/database-$(date +\%Y\%m\%d).sqlite
```

### Restore Database

```bash
# Stop backend trước
pm2 stop mmomarket-backend

# Restore
cp /var/backups/bachhoammo/database-20240205.sqlite \
   /var/BachHoaMMO/BachHoaMMO/backend/prisma/database.sqlite

# Start lại
pm2 start mmomarket-backend
```

---

## 🐛 Troubleshooting

### 1. Lỗi "Cannot find module"

```bash
# Nguyên nhân: Dependencies chưa cài hoặc bị lỗi
cd /var/BachHoaMMO/BachHoaMMO/backend
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules .next
npm install
npm run build
```

### 2. Lỗi "Port already in use"

```bash
# Tìm process đang dùng port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill process
sudo kill -9 <PID>

# Hoặc kil tất cả node processes
sudo pkill -f node
```

### 3. Lỗi 502 Bad Gateway

```bash
# Kiểm tra backend đang chạy
pm2 status

# Nếu offline, xem logs
pm2 logs mmomarket-backend --lines 50

# Restart
pm2 restart mmomarket-backend

# Kiểm tra Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Lỗi Database "SQLITE_BUSY"

```bash
# Stop backend
pm2 stop mmomarket-backend

# Đợi vài giây
sleep 5

# Start lại
pm2 start mmomarket-backend
```

### 5. Lỗi "ENOSPC: no space left on device"

```bash
# Kiểm tra disk space
df -h

# Xoá logs PM2 cũ
pm2 flush

# Xoá node_modules cache
npm cache clean --force

# Xoá old backups
rm -rf /var/backups/bachhoammo/*.sqlite
```

### 6. Frontend build failed

```bash
cd /var/BachHoaMMO/BachHoaMMO/frontend

# Xoá hoàn toàn cache
rm -rf .next node_modules/.cache

# Build lại
npm run build

# Nếu vẫn lỗi, xoá node_modules
rm -rf node_modules
npm install
npm run build
```

### 7. SSL Certificate expired

```bash
# Renew certificate
sudo certbot renew

# Force renew
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📞 Liên hệ hỗ trợ

- **Telegram:** @bachhoammo
- **Email:** support@bachhoammo.store
- **GitHub Issues:** https://github.com/hoangon1z/BachHoaMMO-Update/issues

---

## 📝 Changelog

| Ngày | Phiên bản | Thay đổi |
|------|-----------|----------|
| 2024-02-05 | 1.0 | Tạo tài liệu ban đầu |

---

**Chúc bạn cài đặt thành công! 🚀**
