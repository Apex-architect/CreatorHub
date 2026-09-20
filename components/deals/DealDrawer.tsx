'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Database } from '../../lib/types/database.types';

type BrandDealRow = Database['public']['Tables']['brand_deals']['Row'];

interface DealDrawerProps {
  open: boolean;
  deal?: BrandDealRow;
  onClose: () => void;
}

export function DealDrawer({ open, deal, onClose }: DealDrawerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!deal) {
    return null;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center md:items-stretch md:justify-end"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/40"
            aria-label="Close deal preview"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`Deal with ${deal.brand_name}`}
            initial={
              prefersReducedMotion
                ? false
                : { x: '100%' }
            }
            animate={
              prefersReducedMotion
                ? undefined
                : { x: 0 }
            }
            exit={
              prefersReducedMotion
                ? undefined
                : { x: '100%' }
            }
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 26,
            }}
            className="glass-surface relative h-[70vh] w-full max-w-md rounded-t-2xl border border-border bg-card/90 p-4 shadow-soft md:h-full md:rounded-l-2xl md:rounded-tr-none"
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold sm:text-base">
                  {deal.brand_name}
                </h2>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  {deal.status} •{' '}
                  {deal.deal_value !== null &&
                  deal.deal_value !== undefined
                    ? `${deal.currency ?? 'USD'} ${deal.deal_value.toLocaleString()}`
                    : 'No value set'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs hover:bg-accent/10"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <section className="space-y-3 text-[11px] sm:text-xs">
              <div>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
                  Contact
                </h3>
                <p className="text-muted-foreground">
                  {deal.contact_name ?? 'Not set'}
                </p>
                <p className="text-muted-foreground">
                  {deal.contact_email ?? ''}
                </p>
                <p className="text-muted-foreground">
                  {deal.contact_phone ?? ''}
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
                  Timeline
                </h3>
                <p className="text-muted-foreground">
                  Deal date: {deal.deal_date ?? '—'}
                </p>
                <p className="text-muted-foreground">
                  Due date: {deal.due_date ?? '—'}
                </p>
                <p className="text-muted-foreground">
                  Completed: {deal.completed_date ?? '—'}
                </p>
              </div>

              {deal.notes ? (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-muted-foreground">
                    Notes
                  </h3>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {deal.notes}
                  </p>
                </div>
              ) : null}
            </section>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


