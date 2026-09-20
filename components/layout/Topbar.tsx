'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { useLayoutStore } from '../../lib/store/layout.store';
import { ThemeToggle } from '../shared/ThemeToggle';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/deals': 'Brand Deals',
  '/dashboard/invoices': 'Invoices',
  '/dashboard/tax': 'Tax',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
};

function getTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  const match = Object.entries(ROUTE_TITLES).find(([route]) =>
    pathname.startsWith(route),
  );
  return match?.[1] ?? 'Dashboard';
}

export function Topbar() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { openMobileNav } = useLayoutStore();

  const title = getTitle(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm md:hidden"
            onClick={openMobileNav}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <motion.h1
            key={title}
            className="text-sm font-semibold tracking-tight sm:text-base"
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, y: 4 }
            }
            animate={
              prefersReducedMotion
                ? undefined
                : { opacity: 1, y: 0 }
            }
            transition={{ duration: 0.16 }}
          >
            {title}
          </motion.h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-full border border-border bg-card px-2 text-xs hover:bg-accent sm:px-3 sm:text-sm"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
              AB
            </span>
            <span className="hidden truncate text-muted-foreground sm:inline">
              abdmo@example.com
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}


