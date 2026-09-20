'use client';

import { Suspense } from 'react';

import { useTransactionsStore } from '../../../lib/store/transactions.store';
import { FiltersBar } from '../../../components/transactions/FiltersBar';
import { TransactionsTable } from '../../../components/transactions/TransactionsTable';
import { TransactionListSkeleton } from '../../../components/transactions/TransactionListSkeleton';

function TransactionsContent() {
  const {
    data,
    total,
    limit,
    offset,
    isLoading,
    isFetching,
    error,
    filters,
    selectedTransactionId,
    selectedIds,
    setTypeFilter,
    setCategoryFilter,
    setDateRange,
    setPagination,
    resetFilters,
    selectTransaction,
    toggleSelectId,
    clearSelection,
    deleteTransaction,
    isDeleting,
  } = useTransactionsStore();

  const showSkeleton = isLoading || isFetching;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4">
      <header className="mb-1 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Transactions
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Filter, review, and manage your income and expense activity.
        </p>
      </header>

      <FiltersBar
        filters={filters}
        onTypeChange={setTypeFilter}
        onCategoryChange={setCategoryFilter}
        onDateRangeChange={setDateRange}
        onReset={() => {
          resetFilters();
          clearSelection();
        }}
        total={total}
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
          {error.message}
        </div>
      ) : null}

      {showSkeleton ? (
        <TransactionListSkeleton />
      ) : data.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-center shadow-soft">
          <h2 className="mb-1 text-sm font-semibold sm:text-base">
            No transactions yet
          </h2>
          <p className="mx-auto max-w-content-sm text-xs text-muted-foreground sm:text-sm">
            Start by recording your first income or expense. You can also
            connect Stripe in settings to automatically pull recent
            payments.
          </p>
        </section>
      ) : (
        <TransactionsTable
          rows={data}
          selectedIds={selectedIds}
          selectedTransactionId={selectedTransactionId}
          isLoading={isLoading || isFetching}
          isDeleting={isDeleting}
          limit={limit}
          offset={offset}
          total={total}
          onPageChange={(nextOffset) => setPagination(limit, nextOffset)}
          onToggleSelectRow={toggleSelectId}
          onSelectRow={selectTransaction}
          onDeleteRow={deleteTransaction}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionListSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}


