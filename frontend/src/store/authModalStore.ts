import { create } from 'zustand';

type AuthTab = 'login' | 'register';

interface AuthModalState {
    isOpen: boolean;
    activeTab: AuthTab;
    redirectPath: string | null;
    openLogin: (redirect?: string) => void;
    openRegister: (redirect?: string) => void;
    close: () => void;
    setTab: (tab: AuthTab) => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
    isOpen: false,
    activeTab: 'login',
    redirectPath: null,
    openLogin: (redirect?: string) => set({ isOpen: true, activeTab: 'login', redirectPath: redirect || null }),
    openRegister: (redirect?: string) => set({ isOpen: true, activeTab: 'register', redirectPath: redirect || null }),
    close: () => set({ isOpen: false, redirectPath: null }),
    setTab: (tab) => set({ activeTab: tab }),
}));
