'use client';

import { create } from 'zustand';

interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileNavOpen: boolean;
  toggleSidebar: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarCollapsed: false,
  isMobileNavOpen: false,
  toggleSidebar: () =>
    set((state) => ({
      isSidebarCollapsed: !state.isSidebarCollapsed,
    })),
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}));


