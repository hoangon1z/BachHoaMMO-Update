'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthModal } from '@/store/authModalStore';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { openRegister } = useAuthModal();
  const hasOpened = useRef(false);

  useEffect(() => {
    if (user) {
      router.replace('/');
      return;
    }

    if (!hasOpened.current) {
      hasOpened.current = true;
      openRegister();
      if (window.history.length > 2) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  }, [user, router, openRegister]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Đang chuyển hướng...</span>
      </div>
    </div>
  );
}
