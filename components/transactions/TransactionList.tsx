'use client';

import { motion } from 'framer-motion';

import type { Database } from '../../lib/types/database.types';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

interface TransactionListProps {
  transactions: TransactionRow[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  isDeleting: boolean;
  onPageChange: (nextOffset: number) => void;
  onDelete: (id: string) => void;
  selectedTransactionId?: string;
  onSelectTransaction: (id?: string) => void;
}

export function TransactionList({
  transactions,
  total,
  limit,
  offset,
  isLoading,
  isDeleting,
  onPageChange,
  onDelete,
  selectedTransactionId,
  onSelectTransaction,
}: TransactionListProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (!canPrev) return;
    onPageChange(offset - limit);
  };

  const handleNext = () => {
    if (!canNext) return;
    onPageChange(offset + limit);
  };

  const handleRowClick = (id: string) => {
    if (selectedTransactionId === id) {
      onSelectTransaction(undefined);
    } else {
      onSelectTransaction(id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="grid grid-cols-6 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
          <span>Date</span>
          <span>Type</span>
          <span>Category</span>
          <span className="text-right">Amount</span>
          <span>Description</span>
          <span className="text-right">Actions</span>
        </div>

        {transactions.length === 0 && !isLoading ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No transactions found.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((tx) => (
              <motion.li
                key={tx.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`grid cursor-pointer grid-cols-6 items-center px-3 py-2 text-sm ${
                  selectedTransactionId === tx.id
                    ? 'bg-accent/40'
                    : 'bg-card hover:bg-accent/20'
                }`}
                onClick={() => handleRowClick(tx.id)}
              >
                <span className="truncate text-xs sm:text-sm">
                  {tx.date}
                </span>
                <span
                  className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                    tx.type === 'income'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tx.type}
                </span>
                <span className="truncate text-xs sm:text-sm">
                  {tx.category ?? '—'}
                </span>
                <span className="text-right text-xs font-semibold sm:text-sm">
                  {tx.amount.toFixed(2)} {tx.currency}
                </span>
                <span className="truncate text-xs text-muted-foreground sm:text-sm">
                  {tx.description ?? '—'}
                </span>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(tx.id);
                    }}
                    disabled={isDeleting}
                  >
                    Delete
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canPrev || isLoading}
            className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext || isLoading}
            className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


