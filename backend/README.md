# Backend - NestJS API

Backend API được xây dựng với NestJS, TypeScript, Prisma, và JWT Authentication.

## 🚀 Quick Start

```bash
# Cài đặt dependencies
npm install

# Setup environment
cp .env.example .env

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:push

# Start development server
npm run start:dev
```

## 📁 Cấu trúc thư mục

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── auth/                  # Authentication module
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── guards/           # Auth guards (JWT)
│   │   ├── strategies/       # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/                # Users module
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── prisma/               # Prisma module
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application entry point
├── .env                      # Environment variables
├── nest-cli.json             # NestJS CLI config
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Authentication

- `POST /auth/register` - Đăng ký tài khoản mới
- `POST /auth/login` - Đăng nhập
- `GET /auth/me` - Lấy thông tin user (protected)

### Users

- `GET /users/profile` - Lấy profile user (protected)

## 🔐 Authentication Flow

1. User đăng ký hoặc đăng nhập
2. Server trả về JWT token
3. Client lưu token vào localStorage
4. Client gửi token trong header: `Authorization: Bearer <token>`
5. Server verify token với JWT strategy

## 🗄️ Database Models

### User Model

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🛠️ Commands

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Prisma
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:push        # Push schema to database
npm run prisma:studio      # Open Prisma Studio GUI
```

## 🔧 Configuration

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
MONGODB_URL="mongodb://user:password@localhost:27017/dbname"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
```

## 📝 Adding New Features

### 1. Generate a new module

```bash
nest generate module features/my-feature
nest generate controller features/my-feature
nest generate service features/my-feature
```

### 2. Add to Prisma schema

Edit `prisma/schema.prisma`:

```prisma
model MyModel {
  id        String   @id @default(uuid())
  // ... your fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3. Run migration

```bash
npm run prisma:migrate
```

## 🔒 Security

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens for stateless authentication
- CORS enabled for frontend communication
- Input validation with class-validator
- Environment variables for sensitive data

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Learn More

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Passport JWT](http://www.passportjs.org/packages/passport-jwt)
