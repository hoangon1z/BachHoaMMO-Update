# Frontend - Next.js Application

Frontend application được xây dựng với Next.js 14, TypeScript, Tailwind CSS, Zustand, và shadcn/ui.

## 🚀 Quick Start

```bash
# Cài đặt dependencies
npm install

# Setup environment
cp .env.local.example .env.local

# Start development server
npm run dev
```

## 📁 Cấu trúc thư mục

```
frontend/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── login/            # Login page
│   │   ├── register/         # Register page
│   │   ├── page.tsx          # Home page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   └── ui/               # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── card.tsx
│   ├── lib/
│   │   ├── api.ts            # Axios instance
│   │   └── utils.ts          # Utility functions
│   └── store/
│       └── authStore.ts      # Zustand auth store
├── public/                   # Static files
├── .env.local                # Environment variables
├── next.config.js            # Next.js config
├── tailwind.config.ts        # Tailwind config
├── tsconfig.json             # TypeScript config
└── package.json
```

## 🎨 Pages

### Home Page (`/`)
- Protected route (yêu cầu authentication)
- Hiển thị thông tin user
- Feature cards
- Tech stack information
- Logout button

### Login Page (`/login`)
- Form đăng nhập với email và password
- Error handling
- Redirect đến trang chủ sau khi login thành công
- Link đến trang đăng ký

### Register Page (`/register`)
- Form đăng ký với email, password, confirm password, và tên
- Password validation (min 6 characters, matching)
- Error handling
- Redirect đến trang chủ sau khi đăng ký thành công
- Link đến trang đăng nhập

## 🎯 State Management (Zustand)

### Auth Store

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### Usage

```typescript
import { useAuthStore } from '@/store/authStore';

function MyComponent() {
  const { user, login, logout } = useAuthStore();
  
  // Use state and actions
}
```

## 🎨 UI Components (shadcn/ui)

Components được cài đặt:
- `Button` - Interactive button với variants
- `Input` - Form input field
- `Label` - Form labels
- `Card` - Card container components

### Adding more components

```bash
npx shadcn-ui@latest add [component-name]
```

Available components: https://ui.shadcn.com/docs/components

## 🔌 API Integration

### API Client (`src/lib/api.ts`)

```typescript
import { api } from '@/lib/api';

// GET request
const response = await api.get('/endpoint');

// POST request
const response = await api.post('/endpoint', data);
```

Features:
- Automatic token injection from localStorage
- Interceptors for error handling
- Auto-redirect to login on 401

## 🎨 Styling

### Tailwind CSS

Custom theme được cấu hình trong `tailwind.config.ts`:

```typescript
// Example: Using custom colors
<div className="bg-primary text-primary-foreground">
  Content
</div>
```

### CSS Variables

Global styles trong `src/app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}
```

## 🛠️ Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 🔒 Protected Routes

Routes được bảo vệ bằng client-side check:

```typescript
useEffect(() => {
  checkAuth();
}, [checkAuth]);

useEffect(() => {
  if (!user) {
    router.push('/login');
  }
}, [user, router]);
```

## 📝 Adding New Pages

### 1. Create page file

```bash
# App Router
src/app/my-page/page.tsx
```

### 2. Create page component

```typescript
export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}
```

### 3. Add navigation

```typescript
import Link from 'next/link';

<Link href="/my-page">Go to My Page</Link>
```

## 🎯 Best Practices

### 1. Use Server Components when possible

```typescript
// Server Component (default)
export default function Page() {
  return <div>Server Component</div>;
}

// Client Component
'use client';
export default function Page() {
  return <div>Client Component</div>;
}
```

### 2. Use TypeScript

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
}

const user: User = { ... };
```

### 3. Use Tailwind utility classes

```typescript
<div className="flex items-center justify-between gap-4 p-4">
  Content
</div>
```

## 🔧 Configuration

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Access in code:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
