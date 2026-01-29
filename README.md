# BachHoaMMO - Chợ MMO mua bán tài khoản game

Nền tảng marketplace chuyên mua bán tài khoản game, vật phẩm game, dịch vụ game được xây dựng với Next.js, NestJS, TypeScript, Tailwind CSS, Zustand, và Prisma.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Tech Stack](#-tech-stack)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Chạy project](#-chạy-project)
- [Cấu trúc project](#-cấu-trúc-project)
- [API Documentation](#-api-documentation)

## ✨ Tính năng

### Đã hoàn thành:
- ✅ Authentication: Đăng ký, đăng nhập với JWT
- ✅ Landing Page: Hero banner, categories, featured products
- ✅ Product Listing: Grid view với ProductCard component
- ✅ Categories: 6 danh mục game (Game Accounts, Gift Cards, Game Items, Software, Digital Services, Education)
- ✅ Search Bar: UI với tìm kiếm sản phẩm
- ✅ Responsive Design: Mobile, tablet, desktop
- ✅ Database: SQLite (dev), support PostgreSQL, MongoDB, Redis

### Đang phát triển:
- 🚧 Seller Dashboard: Đăng ký seller, quản lý sản phẩm
- 🚧 Product Detail Page: Chi tiết sản phẩm
- 🚧 Shopping Cart: Giỏ hàng và checkout
- 🚧 Order Management: Quản lý đơn hàng

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **State Management:** Zustand
- **HTTP Client:** Axios

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **ORM:** Prisma
- **Authentication:** JWT + Passport
- **Validation:** class-validator
- **Database:** PostgreSQL (primary), MongoDB, Redis

## 💻 Yêu cầu hệ thống

- Node.js 18+ và npm/yarn/pnpm
- Docker và Docker Compose (cho databases)
- Git

## 📦 Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd fullstack-monorepo
```

### 2. Cài đặt dependencies

```bash
# Cài đặt dependencies cho root workspace
npm install

# Cài đặt dependencies cho backend
cd backend
npm install

# Cài đặt dependencies cho frontend
cd ../frontend
npm install
```

### 3. Setup Databases với Docker

```bash
# Quay lại thư mục root
cd ..

# Khởi động PostgreSQL, MongoDB, và Redis
docker-compose up -d
```

Kiểm tra databases đang chạy:
```bash
docker-compose ps
```

### 4. Cấu hình Environment Variables

#### Backend (.env)

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa file `backend/.env`:
```env
# Database URLs
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fullstack_db?schema=public"
MONGODB_URL="mongodb://admin:admin123@localhost:27017/fullstack_db?authSource=admin"
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# App Configuration
PORT=3001
NODE_ENV="development"
```

#### Frontend (.env.local)

```bash
cd ../frontend
cp .env.local.example .env.local
```

Chỉnh sửa file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Setup Prisma Database

```bash
cd ../backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations (tạo tables trong PostgreSQL)
npm run prisma:migrate

# Hoặc push schema trực tiếp (development)
npm run prisma:push
```

## 🚀 Chạy project

### Cách 1: Chạy tất cả cùng lúc (Recommended)

```bash
# Từ thư mục root
npm run dev
```

Ứng dụng sẽ chạy trên:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

### Cách 2: Chạy riêng lẻ

#### Chạy Backend

```bash
cd backend
npm run start:dev
```

Backend API sẽ chạy tại: http://localhost:3001

#### Chạy Frontend

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

## 📁 Cấu trúc project

```
fullstack-monorepo/
├── backend/                    # NestJS Backend
│   ├── prisma/
│   │   └── schema.prisma      # Prisma schema
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   │   ├── dto/           # Data Transfer Objects
│   │   │   ├── guards/        # Auth guards
│   │   │   ├── strategies/    # Passport strategies
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── users/             # Users module
│   │   ├── prisma/            # Prisma service
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── login/         # Login page
│   │   │   ├── register/      # Register page
│   │   │   ├── page.tsx       # Home page
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios instance
│   │   │   └── utils.ts       # Utility functions
│   │   └── store/
│   │       └── authStore.ts   # Zustand auth store
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── docker-compose.yml          # Docker services
├── package.json                # Root package.json
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/register`
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/auth/login`
Đăng nhập

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### GET `/auth/me`
Lấy thông tin user hiện tại (yêu cầu authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```

### Users Endpoints

#### GET `/users/profile`
Lấy thông tin profile đầy đủ (yêu cầu authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Các lệnh hữu ích

### Backend

```bash
# Generate Prisma Client
npm run prisma:generate

# Tạo migration mới
npm run prisma:migrate

# Push schema trực tiếp (development)
npm run prisma:push

# Mở Prisma Studio (GUI để xem database)
npm run prisma:studio

# Build production
npm run build

# Chạy production
npm run start:prod
```

### Frontend

```bash
# Development mode
npm run dev

# Build production
npm run build

# Chạy production build
npm run start

# Lint code
npm run lint
```

### Docker

```bash
# Khởi động services
docker-compose up -d

# Dừng services
docker-compose down

# Xem logs
docker-compose logs -f

# Restart services
docker-compose restart

# Xóa volumes (reset database)
docker-compose down -v
```

## 🐛 Troubleshooting

### Lỗi kết nối database

1. Kiểm tra Docker containers đang chạy:
```bash
docker-compose ps
```

2. Restart Docker services:
```bash
docker-compose restart
```

3. Kiểm tra DATABASE_URL trong `.env` file

### Lỗi Prisma

```bash
# Xóa node_modules và cài lại
cd backend
rm -rf node_modules
npm install
npm run prisma:generate
```

### Lỗi CORS

Đảm bảo `FRONTEND_URL` trong backend `.env` khớp với URL frontend của bạn.

### Port đã được sử dụng

Thay đổi port trong:
- Backend: `backend/.env` (PORT)
- Frontend: Chạy với `PORT=3002 npm run dev`

## 🎨 Customization

### Thêm màu sắc mới (Tailwind)

Chỉnh sửa `frontend/tailwind.config.ts`:
```typescript
theme: {
  extend: {
    colors: {
      // Thêm màu của bạn ở đây
    }
  }
}
```

### Thêm Database Models

1. Chỉnh sửa `backend/prisma/schema.prisma`
2. Chạy migration:
```bash
npm run prisma:migrate
```

### Thêm shadcn/ui components

```bash
cd frontend
npx shadcn-ui@latest add [component-name]
```

## 📝 License

MIT License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

Nếu bạn gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.

---

**Chúc bạn code vui vẻ! 🚀**
