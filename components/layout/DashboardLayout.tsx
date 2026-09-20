'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { DemoBanner } from '../shared/DemoBanner';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <Topbar />

        <main className="relative flex-1 pb-14 md:pb-0">
          <div className="mx-auto w-full max-w-5xl px-4 pt-2 md:pt-3">
            <DemoBanner />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, y: 6 }
              }
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, y: 0 }
              }
              exit={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, y: -4 }
              }
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}


