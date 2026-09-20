import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { Database } from '../types/database.types';
import { api, ApiError } from '../utils/api';

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

interface TransactionsResponse {
  data: TransactionRow[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

type TransactionTypeFilter = 'income' | 'expense' | undefined;

interface TransactionsFilters {
  type: TransactionTypeFilter;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

interface TransactionsUIState {
  filters: TransactionsFilters;
  selectedTransactionId?: string;
  selectedIds: Set<string>;
  setTypeFilter: (type: TransactionTypeFilter) => void;
  setCategoryFilter: (category?: string) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  setPagination: (limit: number, offset: number) => void;
  selectTransaction: (id?: string) => void;
  toggleSelectId: (id: string) => void;
  clearSelection: () => void;
  resetFilters: () => void;
}

const DEFAULT_LIMIT = 20;

const useTransactionsUIStore = create<TransactionsUIState>((set) => ({
  filters: {
    type: undefined,
    category: undefined,
    startDate: undefined,
    endDate: undefined,
    limit: DEFAULT_LIMIT,
    offset: 0,
  },
  selectedTransactionId: undefined,
  selectedIds: new Set<string>(),
  setTypeFilter: (type) =>
    set((state) => ({
      filters: {
        ...state.filters,
        type,
        offset: 0,
      },
    })),
  setCategoryFilter: (category) =>
    set((state) => ({
      filters: {
        ...state.filters,
        category,
        offset: 0,
      },
    })),
  setDateRange: (startDate, endDate) =>
    set((state) => ({
      filters: {
        ...state.filters,
        startDate,
        endDate,
        offset: 0,
      },
    })),
  setPagination: (limit, offset) =>
    set((state) => ({
      filters: {
        ...state.filters,
        limit,
        offset,
      },
    })),
  selectTransaction: (id) =>
    set(() => ({
      selectedTransactionId: id,
    })),
  toggleSelectId: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),
  clearSelection: () =>
    set(() => ({
      selectedIds: new Set<string>(),
    })),
  resetFilters: () =>
    set(() => ({
      filters: {
        type: undefined,
        category: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: DEFAULT_LIMIT,
        offset: 0,
      },
      selectedIds: new Set<string>(),
    })),
}));

function buildQueryString(filters: TransactionsFilters): string {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set('type', filters.type);
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.startDate) {
    params.set('start_date', filters.startDate);
  }
  if (filters.endDate) {
    params.set('end_date', filters.endDate);
  }
  params.set('limit', String(filters.limit));
  params.set('offset', String(filters.offset));

  return params.toString();
}

export function useTransactionsStore() {
  const {
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
  } = useTransactionsUIStore();

  const queryKey = ['transactions', filters];

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery<TransactionsResponse, ApiError>({
    queryKey,
    queryFn: () => {
      const qs = buildQueryString(filters);
      return api.get<TransactionsResponse>(`/api/transactions?${qs}`);
    },
    keepPreviousData: true,
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation<void, ApiError, string>({
    mutationFn: (id: string) => api.delete<void>(`/api/transactions/${id}`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<TransactionsResponse>(queryKey);

      if (previous) {
        queryClient.setQueryData<TransactionsResponse>(queryKey, {
          data: previous.data.filter((tx) => tx.id !== id),
          pagination: {
            ...previous.pagination,
            total: Math.max(previous.pagination.total - 1, 0),
          },
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    data: data?.data ?? [],
    total: data?.pagination.total ?? 0,
    limit: filters.limit,
    offset: filters.offset,
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
    deleteTransaction: deleteMutation.mutate,
    isDeleting: deleteMutation.isLoading,
  };
}


