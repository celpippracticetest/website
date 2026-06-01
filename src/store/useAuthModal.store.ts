import { create } from "zustand";

export type AuthModalMode = "sign-in" | "sign-up";

interface AuthModalState {
    showLoginModal: boolean;
    loginMessage: string | null;
    authMode: AuthModalMode;
    setShowLoginModal: (
        show: boolean,
        message?: string,
        mode?: AuthModalMode,
    ) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    showLoginModal: false,
    loginMessage: null,
    authMode: "sign-up",
    setShowLoginModal: (
        show: boolean,
        message?: string,
        mode?: AuthModalMode,
    ) =>
        set({
            showLoginModal: show,
            loginMessage: show ? (message ?? null) : null,
            authMode: show ? (mode ?? "sign-up") : "sign-up",
        }),
}));
