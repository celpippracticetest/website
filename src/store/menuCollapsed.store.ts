import { create } from "zustand";

interface MenuCollapsedState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const useMenuCollapsedStore = create<MenuCollapsedState>((set) => ({
  collapsed: false,
  setCollapsed: (collapsed) => set({ collapsed }),
}));
