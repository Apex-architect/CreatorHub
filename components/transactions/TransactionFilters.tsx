'use client';

import { ChangeEvent } from 'react';

type TransactionTypeFilter = 'income' | 'expense' | undefined;

interface TransactionFiltersProps {
  type: TransactionTypeFilter;
  category?: string;
  startDate?: string;
  endDate?: string;
  onTypeChange: (type: TransactionTypeFilter) => void;
  onCategoryChange: (category?: string) => void;
  onDateRangeChange: (start?: string, end?: string) => void;
  onReset: () => void;
}

export function TransactionFilters({
  type,
  category,
  startDate,
  endDate,
  onTypeChange,
  onCategoryChange,
  onDateRangeChange,
  onReset,
}: TransactionFiltersProps) {
  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onTypeChange(value === '' ? undefined : (value as TransactionTypeFilter));
  };

  const handleCategoryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    onCategoryChange(value === '' ? undefined : value);
  };

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || undefined;
    onDateRangeChange(value, endDate);
  };

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value || undefined;
    onDateRangeChange(startDate, value);
  };

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex flex-1 gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Type
          </label>
          <select
            value={type ?? ''}
            onChange={handleTypeChange}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Category
          </label>
          <input
            type="text"
            value={category ?? ''}
            onChange={handleCategoryChange}
            placeholder="Search category"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-1 gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            From
          </label>
          <input
            type="date"
            value={startDate ?? ''}
            onChange={handleStartDateChange}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            To
          </label>
          <input
            type="date"
            value={endDate ?? ''}
            onChange={handleEndDateChange}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        Reset
      </button>
    </div>
  );
}


