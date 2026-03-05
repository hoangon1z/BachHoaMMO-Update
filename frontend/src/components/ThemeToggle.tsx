'use client';

import { useThemeStore } from '@/store/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

export function ThemeToggle({ className = '' }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useThemeStore();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showMenu]);

    const handleSetTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
        // Add transition class temporarily for smooth animation
        document.documentElement.classList.add('theme-transition');
        setTheme(newTheme);
        setShowMenu(false);
        // Remove transition class after animation completes
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 400);
    }, [setTheme]);

    const options = [
        { value: 'light' as const, icon: Sun, label: 'Sáng' },
        { value: 'dark' as const, icon: Moon, label: 'Tối' },
        { value: 'system' as const, icon: Monitor, label: 'Hệ thống' },
    ];

    const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

    return (
        <div ref={menuRef} className={`relative ${className}`}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Chuyển đổi giao diện"
                title={resolvedTheme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
            >
                <CurrentIcon className="w-5 h-5 text-gray-700" />
            </button>

            {showMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
                    {options.map((opt) => {
                        const Icon = opt.icon;
                        const isActive = theme === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => handleSetTheme(opt.value)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span>{opt.label}</span>
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Simple toggle button (no dropdown) - for mobile menu
 */
export function ThemeToggleSimple({ className = '' }: { className?: string }) {
    const { resolvedTheme, setTheme } = useThemeStore();

    const toggle = () => {
        document.documentElement.classList.add('theme-transition');
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, 400);
    };

    return (
        <button
            onClick={toggle}
            className={`flex items-center gap-3 ${className}`}
            aria-label="Chuyển đổi sáng/tối"
        >
            {resolvedTheme === 'dark' ? (
                <>
                    <Sun className="w-5 h-5 text-amber-400" />
                    <span>Chế độ sáng</span>
                </>
            ) : (
                <>
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <span>Chế độ tối</span>
                </>
            )}
        </button>
    );
}
