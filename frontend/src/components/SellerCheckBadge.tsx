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

// ─── Exports ───

interface SellerCheckBadgeProps {
    size?: number;
    className?: string;
    isComplete?: boolean;
    tooltipText?: string;
}

export function SellerCheckBadge({
    size = 24,
    className = '',
    isComplete = false,
    tooltipText = 'Seller đã xác minh đầy đủ thông tin'
}: SellerCheckBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const lottieData = useCachedLottie('/veri/Check.lottie');

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

    if (!isComplete) return null;

    return (
        <div
            ref={ref}
            className={`relative flex-shrink-0 inline-flex cursor-pointer ${className}`}
            style={{ width: size, height: size }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            aria-label={tooltipText}
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
                    <circle cx="12" cy="12" r="11" fill="#22c55e" />
                    <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
                        {tooltipText}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
