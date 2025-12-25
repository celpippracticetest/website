import { create } from 'zustand';

interface AskBeavoStore {
    isOpen: boolean;
    initialMessage: string;
    setOpen: (isOpen: boolean) => void;
    askAboutWord: (word: string) => void;
}

export const useAskBeavoStore = create<AskBeavoStore>((set) => ({
    isOpen: false,
    initialMessage: '',
    setOpen: (isOpen) => set({ isOpen }),
    askAboutWord: (word) => set({
        isOpen: true,
        initialMessage: `Can you explain the word "${word}" with examples and usage in CELPIP context?`
    }),
}));
