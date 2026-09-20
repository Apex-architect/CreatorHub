'use client';

import { TransactionFilters } from './types';

interface FiltersBarProps {
  filters: TransactionFilters;
  onTypeChange: (type: TransactionFilters['type']) => void;
  onCategoryChange: (category?: string) => void;
  onDateRangeChange: (start?: string, end?: string) => void;
  onReset: () => void;
  total: number;
}

export function FiltersBar({
  filters,
  onTypeChange,
  onCategoryChange,
  onDateRangeChange,
  onReset,
  total,
}: FiltersBarProps) {
  return (
    <section
      className="sticky top-0 z-10 -mx-4 mb-3 border-b border-border/60 bg-background/95 px-4 pb-2 pt-3 backdrop-blur"
      aria-label="Transaction filters"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Type
              </label>
              <select
                value={filters.type ?? ''}
                onChange={(event) =>
                  onTypeChange(
                    event.target.value === ''
                      ? undefined
                      : (event.target.value as TransactionFilters['type']),
                  )
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-inner-subtle sm:text-sm"
              >
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Category
              </label>
              <input
                type="text"
                value={filters.category ?? ''}
                onChange={(event) =>
                  onCategoryChange(
                    event.target.value.trim() === ''
                      ? undefined
                      : event.target.value.trim(),
                  )
                }
                placeholder="Search category"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-inner-subtle sm:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-1 gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                From
              </label>
              <input
                type="date"
                value={filters.startDate ?? ''}
                onChange={(event) =>
                  onDateRangeChange(
                    event.target.value || undefined,
                    filters.endDate,
                  )
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-inner-subtle sm:text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                To
              </label>
              <input
                type="date"
                value={filters.endDate ?? ''}
                onChange={(event) =>
                  onDateRangeChange(
                    filters.startDate,
                    event.target.value || undefined,
                  )
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs shadow-inner-subtle sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 sm:justify-end">
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            {total.toLocaleString()} transactions
          </p>
          <button
            type="button"
            onClick={onReset}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-accent/10 sm:text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}


