import { create } from "zustand";

interface AuthModalState {
    showLoginModal: boolean;
    loginMessage: string | null;
    setShowLoginModal: (show: boolean, message?: string) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    showLoginModal: false,
    loginMessage: null,
    setShowLoginModal: (show: boolean, message?: string) =>
        set({
            showLoginModal: show,
            loginMessage: show ? (message || null) : null
        }),
}));
