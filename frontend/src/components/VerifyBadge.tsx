'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Global cache: load .lottie file ONCE, reuse for ALL instances ───
const lottieCache: Record<string, ArrayBuffer> = {};
const loadingPromises: Record<string, Promise<ArrayBuffer | null>> = {};

function useCachedLottie(src: string) {
  const [data, setData] = useState<ArrayBuffer | null>(lottieCache[src] || null);

  useEffect(() => {
    if (lottieCache[src]) {
      setData(lottieCache[src]);
      return;
    }

    if (!loadingPromises[src]) {
      loadingPromises[src] = fetch(src)
        .then(r => r.arrayBuffer())
        .then(buf => {
          lottieCache[src] = buf;
          return buf;
        })
        .catch(() => null);
    }

    loadingPromises[src].then(buf => {
      if (buf) setData(buf);
    });
  }, [src]);

  return data;
}

// ─── Insurance tier config ───
const INSURANCE_TIERS: Record<string, { label: string; color: string; lottie: string }> = {
  BRONZE: { label: 'Đồng', color: '#B87333', lottie: '/lottie/verify/bronze.lottie' },
  SILVER: { label: 'Bạc', color: '#94A3B8', lottie: '/lottie/verify/verified.lottie' },
  GOLD: { label: 'Vàng', color: '#EAB308', lottie: '/lottie/verify/gold.lottie' },
  DIAMOND: { label: 'Kim Cương', color: '#3B82F6', lottie: '/lottie/verify/diamond.lottie' },
  VIP: { label: 'VIP', color: '#8B5CF6', lottie: '/lottie/verify/Premium.lottie' },
};

// Default fallback for old system or generic verified
const DEFAULT_LOTTIE = '/lottie/verify/verified.lottie';

// ─── Exports ───

interface VerifyBadgeProps {
  size?: number;
  className?: string;
  isVerified?: boolean;            // Legacy backward compat
  insuranceLevel?: number;         // 0-5 (0 = not insured)
  insuranceTier?: string | null;   // BRONZE, SILVER, GOLD, DIAMOND, VIP
  tooltipText?: string;
  showLabel?: boolean;             // Show tier label next to badge
}

export function VerifyBadge({
  size = 20,
  className = '',
  isVerified = false,
  insuranceLevel = 0,
  insuranceTier = null,
  tooltipText,
  showLabel = false,
}: VerifyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Determine which lottie file to use
  const tierConfig = insuranceTier ? INSURANCE_TIERS[insuranceTier] : null;
  const lottieSrc = tierConfig?.lottie || DEFAULT_LOTTIE;
  const lottieData = useCachedLottie(lottieSrc);

  // Build tooltip text
  const effectiveTooltip = tooltipText || (
    tierConfig
      ? `Bảo hiểm gói ${tierConfig.label} — Giao dịch được bảo vệ`
      : 'Người bán đã xác minh quỹ bảo hiểm'
  );

  // Determine if we should show the badge
  const shouldShow = isVerified || insuranceLevel > 0;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(prev => !prev);
  }, []);

  if (!shouldShow) return null;

  // SVG fallback colors based on tier
  const fallbackColor = tierConfig?.color || '#3b82f6';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div
        ref={ref}
        className="relative flex-shrink-0 cursor-pointer"
        style={{ width: size, height: size }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        aria-label={effectiveTooltip}
        role="img"
      >
        {lottieData ? (
          <DotLottieReact
            data={lottieData}
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z" fill={fallbackColor} />
            <path d="M9 12l2.5 2.5L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {showTooltip && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
              {effectiveTooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {showLabel && tierConfig && (
        <span
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: tierConfig.color }}
        >
          {tierConfig.label}
        </span>
      )}
    </div>
  );
}
