'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

import { useLayoutStore } from '../../lib/store/layout.store';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: '🏠' },
  { label: 'Transactions', href: '/dashboard/transactions', icon: '💸' },
  { label: 'Deals', href: '/dashboard/deals', icon: '🤝' },
  { label: 'Invoices', href: '/dashboard/invoices', icon: '📄' },
  { label: 'Tax', href: '/dashboard/tax', icon: '🧾' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: '📊' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();

  const widthClass = isSidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`relative z-30 hidden h-screen border-r border-border bg-card/95 backdrop-blur md:flex ${widthClass} flex-col`}
      aria-label="Primary navigation"
    >
      <div className="flex items-center justify-between px-3 py-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            CB
          </div>
          {!isSidebarCollapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              Creator Business Hub
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs hover:bg-accent"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? '›' : '‹'}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <motion.a
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, x: -8 }
              }
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, x: 0 }
              }
              transition={{ duration: 0.15 }}
            >
              <span aria-hidden className="text-base leading-none">
                {item.icon}
              </span>
              {!isSidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </motion.a>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
        {!isSidebarCollapsed && (
          <p className="truncate">
            © {new Date().getFullYear()} Creator Business Hub · Code-X-Builder
          </p>
        )}
      </div>
    </aside>
  );
}



// feat: add tax settings for filing status and preferences
// 2026-01-27T10:51:00

// feat: compute subtotal tax and total authoritatively
// 2026-02-26T15:26:00

// feat: show tax estimate progress through the year
// 2026-03-29T10:01:00

// feat: add Sentry and Axiom hooks as optional
// 2026-04-29T15:36:00

// feat: import platform payouts as transactions
// 2026-05-29T10:11:00

// feat: complete missing modules for production build
// 2026-06-29T15:46:00

// feat: add empty illustration for first-time users
// 2026-07-30T10:21:00

// feat: stabilize core dashboard navigation
// 2026-08-29T15:56:00

// feat: write contributor and security notes
// 2026-09-29T10:31:00
