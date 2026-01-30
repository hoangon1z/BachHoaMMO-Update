'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface VerifyBadgeProps {
  size?: number;
  className?: string;
}

export function VerifyBadge({ size = 20, className = '' }: VerifyBadgeProps) {
  return (
    <div 
      className={`flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <DotLottieReact
        src="/veri/verified.lottie"
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
