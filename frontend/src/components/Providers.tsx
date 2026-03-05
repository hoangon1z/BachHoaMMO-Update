'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { ToastProvider } from './Toast';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { io, Socket } from 'socket.io-client';

/** Initialize theme on app load to prevent flash */
function ThemeInitializer({ children }: { children: ReactNode }) {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => {
    initTheme();
  }, [initTheme]);
  return <>{children}</>;
}

/** Gọi checkAuth khi app load để giữ phiên đăng nhập sau F5 (restore từ localStorage) */
function AuthHydrator({ children }: { children: ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  return <>{children}</>;
}

function resolveSocketUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

/**
 * Global listener for account:banned event.
 * Connects a lightweight socket to /chat namespace just to listen for ban notifications.
 * Runs on every page so the user gets notified immediately regardless of where they are.
 */
function AccountBanListener() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) {
      // Not logged in, clean up any existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Don't create duplicate connections
    if (socketRef.current?.connected) return;

    const socketUrl = resolveSocketUrl();

    const socket = io(`${socketUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[BanListener] ✓ Connected for ban notifications');
    });

    // Listen for account ban
    socket.on('account:banned', (data: { reason: string; bannedAt: string }) => {
      console.log('[BanListener] 🔨 Account banned:', data);

      // Store ban info for display on login page
      localStorage.setItem('account_banned', JSON.stringify({
        reason: data.reason,
        bannedAt: data.bannedAt,
      }));

      // Alert the user immediately
      alert(`⚠️ Tài khoản của bạn đã bị khóa!\n\nLý do: ${data.reason}\n\nBạn sẽ bị đăng xuất ngay bây giờ.`);

      // Force logout
      const { logout } = useAuthStore.getState();
      logout();

      // Disconnect this socket
      socket.disconnect();

      // Redirect to home (login modal will show ban info)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    });

    socket.on('connect_error', (err) => {
      console.log('[BanListener] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ThemeInitializer>
        <AuthHydrator>
          <AccountBanListener />
          <AuthModal />
          {children}
        </AuthHydrator>
      </ThemeInitializer>
    </ToastProvider>
  );
}
