# 📦 Hướng dẫn cài đặt BachHoaMMO

Tài liệu này hướng dẫn chi tiết cách cài đặt và deploy dự án BachHoaMMO trên server production.

## 📋 Mục lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Cài đặt Development](#-cài-đặt-development)
3. [Cài đặt Production](#-cài-đặt-production)
4. [Cấu hình Environment](#-cấu-hình-environment)
5. [Cấu hình Database](#-cấu-hình-database)
6. [Chạy ứng dụng](#-chạy-ứng-dụng)
7. [Cấu hình PM2](#-cấu-hình-pm2)
8. [Cấu hình Nginx](#-cấu-hình-nginx)
9. [SSL/HTTPS](#-sslhttps)
10. [Troubleshooting](#-troubleshooting)

---

## 💻 Yêu cầu hệ thống

### Minimum Requirements
- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM:** 4GB (khuyến nghị 8GB+)
- **CPU:** 2 cores (khuyến nghị 4 cores+)
- **Storage:** 20GB SSD

### Software Requirements
- **Node.js:** v18.x hoặc v20.x (LTS)
- **npm:** v9.x+
- **Git:** v2.x+
- **PostgreSQL:** v14+ (hoặc SQLite cho development)
- **MongoDB:** v6+ (cho chat system)
- **Redis:** v7+ (cho caching/sessions)
- **PM2:** v5+ (process manager)
- **Nginx:** v1.18+ (reverse proxy)

---

## 🔧 Cài đặt Development

### 1. Cài đặt Node.js (nếu chưa có)

```bash
# Sử dụng nvm (khuyến nghị)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Hoặc sử dụng NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clone repository

```bash
git clone https://github.com/hoangon1z/BachHoaMMO-Update.git
cd BachHoaMMO-Update
```

### 3. Cài đặt dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Cấu hình môi trường

```bash
# Backend
cd ../backend
cp .env.example .env
nano .env  # Chỉnh sửa theo hướng dẫn bên dưới

# Frontend
cd ../frontend
nano .env.local  # Tạo file mới
```

### 5. Setup Database

```bash
cd ../backend

# Generate Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate deploy

# (Tùy chọn) Seed data
npx prisma db seed
```

### 6. Chạy development server

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🚀 Cài đặt Production

### 1. Cập nhật system

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Cài đặt dependencies

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build tools
sudo apt-get install -y build-essential

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx

# Certbot (SSL)
sudo apt-get install -y certbot python3-certbot-nginx
```

### 3. Clone và cài đặt

```bash
# Clone repository
cd /var/BachHoaMMO
git clone https://github.com/hoangon1z/BachHoaMMO-Update.git BachHoaMMO
cd BachHoaMMO

# Cài đặt Backend
cd backend
npm install --production
npm run build

# Cài đặt Frontend
cd ../frontend
npm install
npm run build
```

---

## ⚙️ Cấu hình Environment

### Backend (`backend/.env`)

```env
# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV="production"
PORT=3001

# ============================================
# DATABASE
# ============================================
# PostgreSQL (production)
DATABASE_URL="postgresql://user:password@localhost:5432/bachhoammo?schema=public"

# Hoặc SQLite (development)
# DATABASE_URL="file:./database.sqlite"

# MongoDB (for chat)
MONGODB_URL="mongodb://localhost:27017/bachhoammo_chat"

# Redis (for caching/sessions)
REDIS_URL="redis://localhost:6379"

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="7d"

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGIN="https://yourdomain.com"

# ============================================
# FRONTEND URL
# ============================================
FRONTEND_URL="https://yourdomain.com"

# ============================================
# PAYOS PAYMENT GATEWAY
# Get credentials from: https://my.payos.vn
# ============================================
PAYOS_CLIENT_ID="your-payos-client-id"
PAYOS_API_KEY="your-payos-api-key"
PAYOS_CHECKSUM_KEY="your-payos-checksum-key"
PAYOS_BASE_URL="https://yourdomain.com"

# ============================================
# EMAIL SERVICE
# ============================================
EMAIL_PROVIDER=resend
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="BachHoaMMO"

# Gmail (alternative)
# GMAIL_USER="your-email@gmail.com"
# GMAIL_APP_PASSWORD="your-app-password"

# ============================================
# ENCRYPTION KEY
# ============================================
ENCRYPTION_KEY="your-encryption-key-32-characters"

# ============================================
# TELEGRAM BOT (optional)
# ============================================
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

### Frontend (`frontend/.env.local`)

```env
# API URL (internal - same server)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Socket URL (backend WebSocket)
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com

# Site URL (for SEO)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Encryption Key (must match backend)
NEXT_PUBLIC_ENCRYPTION_KEY="your-encryption-key-32-characters"
```

---

## 🗄️ Cấu hình Database

### PostgreSQL

```bash
# Cài đặt PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Khởi động service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Tạo database và user
sudo -u postgres psql
```

```sql
CREATE DATABASE bachhoammo;
CREATE USER bachhoammo_user WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE bachhoammo TO bachhoammo_user;
\q
```

### MongoDB

```bash
# Import MongoDB GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Redis

```bash
# Cài đặt Redis
sudo apt-get install -y redis-server

# Khởi động service
sudo systemctl start redis
sudo systemctl enable redis

# Test connection
redis-cli ping
# Should return: PONG
```

---

## ▶️ Chạy ứng dụng

### Development

```bash
# Backend (Terminal 1)
cd backend
npm run start:dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### Production (với PM2)

```bash
# Setup ecosystem file
pm2 ecosystem

# Hoặc khởi động thủ công
cd /var/BachHoaMMO/BachHoaMMO

# Backend
pm2 start backend/dist/main.js --name mmomarket-backend

# Frontend
pm2 start npm --name mmomarket-frontend -- start --cwd /var/BachHoaMMO/BachHoaMMO/frontend

# Lưu cấu hình
pm2 save
pm2 startup
```

---

## 📦 Cấu hình PM2

### Tạo ecosystem.config.js

```javascript
// /var/BachHoaMMO/BachHoaMMO/ecosystem.config.js
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
      }
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
      }
    }
  ]
};
```

### Các lệnh PM2 thường dùng

```bash
# Khởi động
pm2 start ecosystem.config.js

# Xem status
pm2 status

# Xem logs
pm2 logs
pm2 logs mmomarket-backend
pm2 logs mmomarket-frontend

# Restart
pm2 restart all
pm2 restart mmomarket-backend
pm2 restart mmomarket-frontend

# Stop
pm2 stop all

# Delete
pm2 delete all

# Monitor
pm2 monit
```

---

## 🌐 Cấu hình Nginx

### Tạo config file

```bash
sudo nano /etc/nginx/sites-available/bachhoammo
```

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    # Increase body size for file uploads
    client_max_body_size 50M;

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
    }

    # Serve uploaded files
    location /uploads {
        alias /var/BachHoaMMO/BachHoaMMO/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable config

```bash
sudo ln -s /etc/nginx/sites-available/bachhoammo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL/HTTPS

### Cài đặt SSL với Certbot

```bash
# Lấy SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renew
sudo certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Lỗi phổ biến và cách khắc phục

#### 1. Port already in use

```bash
# Tìm process đang dùng port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill process
kill -9 <PID>
```

#### 2. Permission denied

```bash
# Sửa quyền thư mục
sudo chown -R $USER:$USER /var/BachHoaMMO/BachHoaMMO
```

#### 3. Database connection error

```bash
# Kiểm tra PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"

# Kiểm tra MongoDB
sudo systemctl status mongod
mongo --eval "db.stats()"

# Kiểm tra Redis
redis-cli ping
```

#### 4. Build failed

```bash
# Xóa cache và build lại
cd frontend
rm -rf .next node_modules/.cache
npm run build

cd ../backend
rm -rf dist
npm run build
```

#### 5. PM2 không start được

```bash
# Xem logs
pm2 logs --lines 100

# Reset PM2
pm2 kill
pm2 start ecosystem.config.js
```

#### 6. Nginx 502 Bad Gateway

```bash
# Kiểm tra backend đang chạy
pm2 status

# Kiểm tra logs
pm2 logs mmomarket-backend

# Restart
pm2 restart all
sudo systemctl reload nginx
```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề trong quá trình cài đặt:
- Tạo issue trên GitHub
- Liên hệ qua Telegram: @bachhoammo

---

**Chúc bạn cài đặt thành công! 🚀**
