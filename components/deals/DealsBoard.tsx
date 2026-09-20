'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  PointerEvent,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Database } from '../../lib/types/database.types';
import { DealCard } from './DealCard';
import { DealDrawer } from './DealDrawer';

type BrandDealRow = Database['public']['Tables']['brand_deals']['Row'];

type DealStatus =
  | 'lead'
  | 'negotiating'
  | 'contracted'
  | 'delivered'
  | 'paid'
  | 'lost';

interface ColumnConfig {
  key: DealStatus;
  label: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'negotiating', label: 'Negotiating' },
  { key: 'contracted', label: 'Contracted' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'paid', label: 'Paid' },
  { key: 'lost', label: 'Lost' },
];

interface DealsBoardProps {
  deals: BrandDealRow[];
  onMoveDeal: (dealId: string, newStatus: DealStatus) => void;
}

interface DragState {
  id: string;
  status: DealStatus;
}

export function DealsBoard({ deals, onMoveDeal }: DealsBoardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overStatus, setOverStatus] = useState<DealStatus | null>(null);
  const [previewDeal, setPreviewDeal] = useState<BrandDealRow | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        deals: deals.filter((deal) => deal.status === col.key),
      })),
    [deals],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!drag || !boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const scrollThreshold = 48;

      if (event.clientY < rect.top + scrollThreshold) {
        boardRef.current.scrollBy({ top: -10, behavior: 'smooth' });
      } else if (event.clientY > rect.bottom - scrollThreshold) {
        boardRef.current.scrollBy({ top: 10, behavior: 'smooth' });
      }
    },
    [drag],
  );

  const handleDrop = (status: DealStatus) => {
    if (drag && drag.status !== status) {
      onMoveDeal(drag.id, status);
    }
    setDrag(null);
    setOverStatus(null);
  };

  const statusLabel = (status: DealStatus) =>
    COLUMNS.find((c) => c.key === status)?.label ?? status;

  return (
    <>
      <section
        ref={boardRef}
        className="flex h-[calc(100vh-8rem)] flex-col gap-3 overflow-x-auto overflow-y-hidden"
        aria-label="Deals pipeline board"
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          setDrag(null);
          setOverStatus(null);
        }}
      >
        <div className="flex min-h-0 gap-3">
          {columns.map((column) => {
            const isActiveDropZone = overStatus === column.key;
            const hasDrag = Boolean(drag);

            return (
              <div
                key={column.key}
                className="flex min-w-[220px] max-w-xs flex-1 flex-col rounded-lg border border-border bg-muted/30 p-2"
                onPointerEnter={() => {
                  if (drag) {
                    setOverStatus(column.key);
                  }
                }}
                onPointerLeave={() => {
                  setOverStatus((prev) =>
                    prev === column.key ? null : prev,
                  );
                }}
                onPointerUp={() => handleDrop(column.key)}
              >
                <header className="mb-1 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                      {column.label}
                    </h2>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {column.deals.length}
                  </span>
                </header>

                <motion.div
                  className={`flex-1 space-y-2 rounded-md p-1 ${
                    isActiveDropZone && hasDrag
                      ? 'bg-primary/10 shadow-soft-lg'
                      : 'bg-transparent'
                  }`}
                  layout
                  transition={{
                    type: prefersReducedMotion ? false : 'spring',
                    stiffness: 260,
                    damping: 26,
                  }}
                >
                  {column.deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => {
                        setPreviewDeal(deal);
                        setDrawerOpen(true);
                      }}
                      onPointerDown={(event) => {
                        if (event.pointerType === 'mouse') {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                        }
                        setDrag({ id: deal.id, status: deal.status as DealStatus });
                      }}
                      onDragStart={(event) => {
                        if (!drag) return;
                        event.preventDefault();
                      }}
                    />
                  ))}

                  {column.deals.length === 0 && (
                    <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border/60 text-[11px] text-muted-foreground sm:text-xs">
                      Drop deals here
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      <DealDrawer
        open={drawerOpen}
        deal={previewDeal}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}


