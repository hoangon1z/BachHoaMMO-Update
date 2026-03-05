'use client';

import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    initTheme: () => void;
}

const STORAGE_KEY = 'bhmmo_theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolved === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    // Set color-scheme for native elements (scrollbar, inputs)
    root.style.colorScheme = resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: 'light',
    resolvedTheme: 'light',

    setTheme: (theme: Theme) => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, theme);
        }

        set({ theme, resolvedTheme: resolved });
    },

    initTheme: () => {
        if (typeof window === 'undefined') return;

        // Read stored preference
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        const theme = stored || 'light';
        const resolved = theme === 'system' ? getSystemTheme() : theme;

        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });

        // Listen for system theme changes (only when user picked 'system')
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const current = get().theme;
            if (current === 'system') {
                const newResolved = getSystemTheme();
                applyTheme(newResolved);
                set({ resolvedTheme: newResolved });
            }
        };
        mediaQuery.addEventListener('change', handleChange);
    },
}));
