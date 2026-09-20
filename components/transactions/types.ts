import type { Database } from '../../lib/types/database.types';

export type TransactionRow =
  Database['public']['Tables']['transactions']['Row'];

export type TransactionTypeFilter = 'income' | 'expense' | undefined;

export interface TransactionFilters {
  type: TransactionTypeFilter;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}


