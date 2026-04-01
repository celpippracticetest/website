import { create } from 'zustand';

interface AskBeavoStore {
    isOpen: boolean;
    initialMessage: string;
    setOpen: (isOpen: boolean) => void;
    /** Opens the AI chat with no prefilled message (e.g. floating button). */
    openAskBeavo: () => void;
    askAboutWord: (word: string) => void;
}

export const useAskBeavoStore = create<AskBeavoStore>((set) => ({
    isOpen: false,
    initialMessage: '',
    setOpen: (isOpen) =>
        set({
            isOpen,
            ...(isOpen === false ? { initialMessage: "" } : {}),
        }),
    openAskBeavo: () => set({ isOpen: true, initialMessage: '' }),
    askAboutWord: (word) => set({
        isOpen: true,
        initialMessage: `Can you explain the word "${word}" with examples and usage in CELPIP context?`
    }),
}));
