# 🚀 Hướng dẫn Setup nhanh

Tài liệu này hướng dẫn setup project từ đầu đến cuối trong 5 phút.

## ⚡ Quick Start (5 phút)

### Bước 1: Khởi động Databases (1 phút)

```bash
# Khởi động PostgreSQL, MongoDB, Redis
docker-compose up -d

# Kiểm tra
docker-compose ps
```

### Bước 2: Setup Backend (2 phút)

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Setup Prisma
npm run prisma:generate
npm run prisma:push

# Khởi động backend
npm run start:dev
```

Backend sẽ chạy tại: **http://localhost:3001**

### Bước 3: Setup Frontend (2 phút)

Mở terminal mới:

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
npm install

# Tạo file .env.local
cp .env.local.example .env.local

# Khởi động frontend
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3000**

### Bước 4: Kiểm tra (30 giây)

1. Mở trình duyệt: http://localhost:3000
2. Bạn sẽ được redirect đến `/login`
3. Click "Đăng ký ngay"
4. Tạo tài khoản mới
5. Đăng nhập và xem trang chủ!

## 🎯 Checklist

- [ ] Docker đang chạy
- [ ] PostgreSQL container đang chạy (port 5432)
- [ ] MongoDB container đang chạy (port 27017)
- [ ] Redis container đang chạy (port 6379)
- [ ] Backend đang chạy (port 3001)
- [ ] Frontend đang chạy (port 3000)
- [ ] File `.env` trong thư mục backend
- [ ] File `.env.local` trong thư mục frontend

## 🔍 Kiểm tra Backend API

```bash
# Kiểm tra backend health
curl http://localhost:3001

# Test register API
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","name":"Test User"}'
```

## 🎨 Test UI

### Trang Login: http://localhost:3000/login
- Form đăng nhập với email và password
- Link đến trang đăng ký
- Validation và error handling

### Trang Register: http://localhost:3000/register
- Form đăng ký với email, password, confirm password, và tên
- Validation password khớp
- Link đến trang đăng nhập

### Trang Home: http://localhost:3000
- Hiển thị thông tin user
- Button đăng xuất
- Feature cards
- Tech stack info

## ⚙️ Cấu hình mặc định

### Database Credentials

**PostgreSQL:**
- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres
- Database: fullstack_db

**MongoDB:**
- Host: localhost
- Port: 27017
- User: admin
- Password: admin123
- Database: fullstack_db

**Redis:**
- Host: localhost
- Port: 6379
- No password

### JWT Configuration

- Secret: Đổi trong `backend/.env`
- Expires: 7 days

## 🐛 Các lỗi thường gặp

### 1. "Port already in use"

```bash
# Tìm và kill process đang dùng port
# Linux/Mac
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 2. "Cannot connect to database"

```bash
# Restart Docker containers
docker-compose restart

# Hoặc stop và start lại
docker-compose down
docker-compose up -d
```

### 3. "Prisma Client not generated"

```bash
cd backend
npm run prisma:generate
```

### 4. "Module not found"

```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

## 📊 Prisma Studio

Xem và quản lý database với GUI:

```bash
cd backend
npm run prisma:studio
```

Mở trình duyệt: http://localhost:5555

## 🔄 Reset Database

```bash
# Dừng và xóa tất cả data
docker-compose down -v

# Khởi động lại
docker-compose up -d

# Re-run migrations
cd backend
npm run prisma:push
```

## 📦 Production Build

### Backend

```bash
cd backend
npm run build
npm run start:prod
```

### Frontend

```bash
cd frontend
npm run build
npm run start
```

## 🌐 Environment Variables

### Backend `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fullstack_db?schema=public"
MONGODB_URL="mongodb://admin:admin123@localhost:27017/fullstack_db?authSource=admin"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🎉 Hoàn thành!

Bây giờ bạn có thể:

1. ✅ Đăng ký tài khoản mới
2. ✅ Đăng nhập
3. ✅ Xem trang chủ được bảo vệ
4. ✅ Đăng xuất
5. ✅ Bắt đầu phát triển tính năng mới!

---

**Nếu bạn vẫn gặp vấn đề, vui lòng tạo issue trên GitHub!** 🙏
