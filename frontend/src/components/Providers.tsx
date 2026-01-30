'use client';

import { ReactNode, useEffect } from 'react';
import { ToastProvider } from './Toast';
import { useAuthStore } from '@/store/authStore';

/** Gọi checkAuth khi app load để giữ phiên đăng nhập sau F5 (restore từ localStorage) */
function AuthHydrator({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthHydrator>
        {children}
      </AuthHydrator>
    </ToastProvider>
  );
}
