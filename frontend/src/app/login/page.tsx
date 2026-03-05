'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthModal } from '@/store/authModalStore';
import { Loader2 } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { openLogin } = useAuthModal();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      router.replace(redirect);
      return;
    }

    if (!hasOpened.current) {
      hasOpened.current = true;
      const redirect = searchParams.get('redirect') || undefined;
      openLogin(redirect);
      if (window.history.length > 2) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  }, [user, router, searchParams, openLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Đang chuyển hướng...</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Đang tải...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
