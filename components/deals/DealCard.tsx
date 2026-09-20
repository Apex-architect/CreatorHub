'use client';

import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import type { Database } from '../../lib/types/database.types';

type BrandDealRow = Database['public']['Tables']['brand_deals']['Row'];

interface DealCardProps {
  deal: BrandDealRow;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

export const DealCard = memo(function DealCard({
  deal,
  onClick,
  draggable = true,
  onDragStart,
  onPointerDown,
}: DealCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const value =
    deal.deal_value !== null && deal.deal_value !== undefined
      ? deal.deal_value
      : 0;

  return (
    <motion.article
      layout
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
          : { opacity: 0, y: 4 }
      }
      transition={{ duration: 0.16 }}
      className="card group cursor-grab touch-pan-y select-none bg-card/95 p-3 text-xs shadow-soft active:cursor-grabbing sm:text-sm"
      role="button"
      tabIndex={0}
      aria-label={`Deal with ${deal.brand_name}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onDragStart}
      data-draggable={draggable}
    >
      <header className="mb-1 flex items-center justify-between gap-2">
        <h3 className="truncate font-medium text-foreground">
          {deal.brand_name}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
          {deal.currency ?? 'USD'}{' '}
          {value.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        </span>
      </header>
      {deal.notes ? (
        <p className="line-clamp-2 text-[11px] text-muted-foreground sm:text-xs">
          {deal.notes}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          {deal.contact_name ?? deal.contact_email ?? 'No primary contact'}
        </p>
      )}
      <footer className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {deal.status}
        </span>
        {deal.due_date ? (
          <span className="text-[10px] text-muted-foreground sm:text-[11px]">
            Due {deal.due_date}
          </span>
        ) : null}
      </footer>
    </motion.article>
  );
});


