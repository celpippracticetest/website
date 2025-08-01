import { create } from "zustand";

interface ButtonVisibleState {
  isVisible: boolean;
  isInFooter: boolean;
  setVisible: (isVisible: boolean) => void;
  setInFooter: (isInFooter: boolean) => void;
}

export const useButtonVisibleStore = create<ButtonVisibleState>((set) => ({
  isVisible: false,
  isInFooter: false,
  setVisible: (isVisible) => set({ isVisible }),
  setInFooter: (isInFooter) => set({ isInFooter }),
}));
