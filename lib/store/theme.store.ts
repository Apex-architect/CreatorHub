'use client';

import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  hydrate: () => void;
}

function getPreferredColorScheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  const resolvedTheme =
    mode === 'system' ? getPreferredColorScheme() : mode;

  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolved: 'light',
  setMode: (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cbh-theme', mode);
    }
    applyTheme(mode);
    const resolved =
      mode === 'system' ? getPreferredColorScheme() : mode;
    set({ mode, resolved });
  },
  hydrate: () => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem('cbh-theme') as
      | ThemeMode
      | null;
    const mode = stored ?? 'system';
    applyTheme(mode);
    const resolved =
      mode === 'system' ? getPreferredColorScheme() : mode;
    set({ mode, resolved });
  },
}));


