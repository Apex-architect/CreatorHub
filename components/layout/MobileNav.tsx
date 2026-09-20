'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { useLayoutStore } from '../../lib/store/layout.store';

const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: '💸' },
  { label: 'Deals', href: '/dashboard/deals', icon: '🤝' },
  { label: 'More', href: '/dashboard/settings', icon: '⋯' },
];

export function MobileNav() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { isMobileNavOpen, closeMobileNav } = useLayoutStore();

  return (
    <>
      {/* Bottom bar for primary actions */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-background/95 px-2 py-1.5 text-xs shadow-sm md:hidden"
        aria-label="Primary mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-full px-2 py-1 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              <span className="text-[10px]">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Slide-in drawer for full nav */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <motion.aside
            className="fixed inset-0 z-40 md:hidden"
            aria-modal="true"
            role="dialog"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 h-full w-full bg-black/40"
              aria-label="Close navigation"
              onClick={closeMobileNav}
            />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-64 max-w-full flex-col border-r border-border bg-card"
              initial={prefersReducedMotion ? false : { x: '-100%' }}
              animate={prefersReducedMotion ? undefined : { x: 0 }}
              exit={prefersReducedMotion ? undefined : { x: '-100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                    CB
                  </div>
                  <span className="text-sm font-semibold tracking-tight">
                    Creator Hub
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMobileNav}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm"
                  aria-label="Close navigation"
                >
                  ✕
                </button>
              </div>

              <nav
                className="mt-2 flex-1 space-y-1 px-3 pb-6"
                aria-label="Dashboard navigation"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`);

                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileNav}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <span aria-hidden className="text-base leading-none">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </nav>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}


