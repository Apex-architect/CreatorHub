'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

import { useThemeStore } from '../../lib/store/theme.store';

export function ThemeToggle() {
  const { mode, resolved, setMode, hydrate } = useThemeStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const nextMode = resolved === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setMode(nextMode)}
      aria-label={`Switch to ${nextMode} mode`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs"
    >
      <motion.span
        key={resolved}
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.15 }}
      >
        {resolved === 'dark' ? '🌙' : '☀️'}
      </motion.span>
    </button>
  );
}


