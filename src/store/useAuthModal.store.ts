import { create } from "zustand";

interface AuthModalState {
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
    showLoginModal: false,
    setShowLoginModal: (show: boolean) => set({ showLoginModal: show }),
}));
