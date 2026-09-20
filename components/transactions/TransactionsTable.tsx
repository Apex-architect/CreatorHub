'use client';

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
  UIEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TransactionRow } from './types';

interface TransactionsTableProps {
  rows: TransactionRow[];
  selectedIds: Set<string>;
  selectedTransactionId?: string;
  isLoading: boolean;
  isDeleting: boolean;
  limit: number;
  offset: number;
  total: number;
  onPageChange: (nextOffset: number) => void;
  onToggleSelectRow: (id: string) => void;
  onSelectRow: (id?: string) => void;
  onDeleteRow: (id: string) => void;
}

const ROW_HEIGHT = 52;
const OVERSCAN = 6;

interface TableRowProps {
  row: TransactionRow;
  isSelected: boolean;
  isChecked: boolean;
  onToggleChecked: () => void;
  onDelete: () => void;
}

const categoryColor: Record<string, string> = {
  sponsorship: 'bg-emerald-500/10 text-emerald-500',
  ad_revenue: 'bg-sky-500/10 text-sky-500',
  software: 'bg-indigo-500/10 text-indigo-500',
  equipment: 'bg-amber-500/10 text-amber-500',
  travel: 'bg-violet-500/10 text-violet-500',
};

const TransactionsTableRow = memo(function TransactionsTableRow({
  row,
  isSelected,
  isChecked,
  onToggleChecked,
  onDelete,
}: TableRowProps) {
  const prefersReducedMotion = useReducedMotion();
  const catClass =
    categoryColor[row.category ?? ''] ??
    'bg-muted text-muted-foreground';

  return (
    <motion.tr
      key={row.id}
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
      transition={{ duration: 0.12 }}
      className={`group text-xs sm:text-sm ${
        isSelected ? 'bg-accent/40' : 'bg-card'
      }`}
    >
      <td className="w-8 px-2">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggleChecked}
          aria-label="Select transaction"
          className="h-4 w-4 rounded border-input text-primary"
        />
      </td>
      <td className="px-2 py-1.5 align-middle text-xs text-muted-foreground sm:text-sm">
        {row.date}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <span
          className={`inline-flex min-w-[64px] justify-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
            row.type === 'income'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-rose-500/10 text-rose-500'
          }`}
        >
          {row.type}
        </span>
      </td>
      <td className="px-2 py-1.5 align-middle">
        <span
          className={`inline-flex max-w-[112px] items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${catClass}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <span className="truncate">
            {row.category ?? 'Uncategorized'}
          </span>
        </span>
      </td>
      <td className="px-2 py-1.5 text-right align-middle font-semibold">
        {row.amount.toFixed(2)} {row.currency}
      </td>
      <td className="hidden px-2 py-1.5 align-middle text-xs text-muted-foreground sm:table-cell">
        <span className="line-clamp-1">
          {row.description ?? '—'}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right align-middle">
        <button
          type="button"
          onClick={onDelete}
          className="text-[11px] font-medium text-destructive hover:underline disabled:opacity-50 sm:text-xs"
        >
          Delete
        </button>
      </td>
    </motion.tr>
  );
});

export function TransactionsTable({
  rows,
  selectedIds,
  selectedTransactionId,
  isLoading,
  isDeleting,
  limit,
  offset,
  total,
  onPageChange,
  onToggleSelectRow,
  onSelectRow,
  onDeleteRow,
}: TransactionsTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  const rowCount = rows.length;
  const viewportHeight = 480;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN,
  );
  const endIndex = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [rows, startIndex, endIndex],
  );

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (rows.length === 0) return;

    const currentIndex = rows.findIndex(
      (row) => row.id === selectedTransactionId,
    );

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(rows.length - 1, currentIndex + 1);
      onSelectRow(rows[nextIndex]?.id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex =
        currentIndex === -1 ? 0 : Math.max(0, currentIndex - 1);
      onSelectRow(rows[nextIndex]?.id);
    } else if (event.key === 'Escape') {
      onSelectRow(undefined);
    }
  };

  useEffect(() => {
    if (!selectedTransactionId || !containerRef.current) {
      return;
    }
    const index = rows.findIndex(
      (row) => row.id === selectedTransactionId,
    );
    if (index === -1) return;

    const rowTop = index * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    const container = containerRef.current;
    const { scrollTop: st, clientHeight } = container;

    if (rowTop < st) {
      container.scrollTo({ top: rowTop });
    } else if (rowBottom > st + clientHeight) {
      container.scrollTo({ top: rowBottom - clientHeight });
    }
  }, [selectedTransactionId, rows]);

  return (
    <section
      className="flex flex-1 flex-col rounded-lg border border-border bg-card shadow-soft"
      aria-label="Transactions table"
    >
      <div
        ref={containerRef}
        className="max-h-[480px] overflow-auto"
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
            <tr className="text-[11px] text-muted-foreground sm:text-xs">
              <th className="w-8 px-2 py-2 text-left font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={
                    rows.length > 0 &&
                    rows.every((row) => selectedIds.has(row.id))
                  }
                  onChange={() => {
                    const allSelected =
                      rows.length > 0 &&
                      rows.every((row) => selectedIds.has(row.id));
                    if (allSelected) {
                      rows.forEach((row) => onToggleSelectRow(row.id));
                    } else {
                      rows.forEach((row) => {
                        if (!selectedIds.has(row.id)) {
                          onToggleSelectRow(row.id);
                        }
                      });
                    }
                  }}
                  className="h-4 w-4 rounded border-input text-primary"
                />
              </th>
              <th className="px-2 py-2 text-left font-medium">Date</th>
              <th className="px-2 py-2 text-left font-medium">Type</th>
              <th className="px-2 py-2 text-left font-medium">
                Category
              </th>
              <th className="px-2 py-2 text-right font-medium">Amount</th>
              <th className="hidden px-2 py-2 text-left font-medium sm:table-cell">
                Description
              </th>
              <th className="px-2 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody
            style={{
              height: rowCount * ROW_HEIGHT,
            }}
          >
            <tr style={{ height: startIndex * ROW_HEIGHT }} />
            {visibleRows.map((row) => (
              <TransactionsTableRow
                key={row.id}
                row={row}
                isSelected={selectedTransactionId === row.id}
                isChecked={selectedIds.has(row.id)}
                onToggleChecked={() => onToggleSelectRow(row.id)}
                onDelete={() => onDeleteRow(row.id)}
              />
            ))}
            <tr
              style={{
                height:
                  (rowCount - endIndex) > 0
                    ? (rowCount - endIndex) * ROW_HEIGHT
                    : 0,
              }}
            />
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground sm:text-xs">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => canPrev && onPageChange(offset - limit)}
            disabled={!canPrev || isLoading}
            className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent/10 disabled:opacity-50 sm:text-xs"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => canNext && onPageChange(offset + limit)}
            disabled={!canNext || isLoading}
            className="rounded-md border border-input px-2 py-1 text-[11px] font-medium hover:bg-accent/10 disabled:opacity-50 sm:text-xs"
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}


