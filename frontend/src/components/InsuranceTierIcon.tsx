'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/* ═══════════════════════════════════════════════════════════
   Insurance Tier Icons using .lottie files
   Files located at /public/lottie/verify/
   ═══════════════════════════════════════════════════════════ */

interface InsuranceTierIconProps {
    tier: string;
    size?: number;
    loop?: boolean;
    className?: string;
}

// Map tier names to .lottie file paths
const TIER_LOTTIE_MAP: Record<string, string> = {
    BRONZE: '/lottie/verify/bronze.lottie',
    SILVER: '/lottie/verify/verified.lottie',  // Use verified as silver
    GOLD: '/lottie/verify/gold.lottie',
    DIAMOND: '/lottie/verify/diamond.lottie',
    VIP: '/lottie/verify/Premium.lottie',
};

// Tier colors for static fallback
const TIER_COLORS: Record<string, string> = {
    BRONZE: '#b45309',
    SILVER: '#64748b',
    GOLD: '#a16207',
    DIAMOND: '#1d4ed8',
    VIP: '#7c3aed',
};

export function InsuranceTierIcon({ tier, size = 48, loop = true, className }: InsuranceTierIconProps) {
    const lottieUrl = TIER_LOTTIE_MAP[tier] || TIER_LOTTIE_MAP.BRONZE;

    return (
        <div className={className} style={{ width: size, height: size }}>
            <DotLottieReact
                src={lottieUrl}
                loop={loop}
                autoplay
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}

export function InsuranceTierIconStatic({ tier, size = 24 }: { tier: string; size?: number }) {
    const color = TIER_COLORS[tier] || TIER_COLORS.BRONZE;

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
                fill={color}
                opacity={0.15}
            />
            <path
                d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
                stroke={color}
                strokeWidth={1.5}
                fill="none"
            />
            <path
                d="M9 12l2 2 4-4"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
