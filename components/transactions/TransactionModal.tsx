'use client';

import { useEffect } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '../../lib/utils/api';
import type { TransactionRow } from './types';
import { TransactionForm, type TransactionFormProps } from './TransactionForm';

interface TransactionModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  transaction?: TransactionRow;
  onClose: () => void;
}

export function TransactionModal({
  open,
  mode,
  transaction,
  onClose,
}: TransactionModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const queryClient = useQueryClient();

  const mutation = useMutation<void, ApiError, TransactionFormProps['initialTransaction'] & { values: Parameters<TransactionFormProps['onSubmit']>[0] }>({
    mutationFn: async (payload) => {
      if (mode === 'create') {
        await api.post('/api/transactions', payload.values);
      } else if (transaction) {
        await api.patch(`/api/transactions/${transaction.id}`, payload.values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    },
  });

  useEffect(() => {
    if (!open) {
      mutation.reset();
    }
  }, [open, mutation]);

  const handleSubmit: TransactionFormProps['onSubmit'] = async (values) => {
    await mutation.mutateAsync({ initialTransaction: transaction, values });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center md:items-center"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/40"
            aria-label="Close transaction editor"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={
              mode === 'create'
                ? 'Create transaction'
                : 'Edit transaction'
            }
            initial={
              prefersReducedMotion
                ? false
                : isDesktop
                ? { opacity: 0, scale: 0.96, y: 8 }
                : { y: '100%' }
            }
            animate={
              prefersReducedMotion
                ? undefined
                : isDesktop
                ? { opacity: 1, scale: 1, y: 0 }
                : { y: 0 }
            }
            exit={
              prefersReducedMotion
                ? undefined
                : isDesktop
                ? { opacity: 0, scale: 0.96, y: 8 }
                : { y: '100%' }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : {
                    type: 'spring',
                    stiffness: 260,
                    damping: 26,
                  }
            }
            className={`glass-surface relative w-full max-w-content-md rounded-t-2xl border border-border bg-card/90 p-4 shadow-soft md:max-w-lg md:rounded-2xl ${
              isDesktop ? '' : 'mx-0 mb-0'
            }`}
          >
            <header className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold sm:text-base">
                  {mode === 'create'
                    ? 'New transaction'
                    : 'Edit transaction'}
                </h2>
                {mutation.error ? (
                  <p className="mt-1 text-[11px] text-destructive sm:text-xs">
                    {mutation.error.message}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                    {mode === 'create'
                      ? 'Record a new income or expense.'
                      : 'Update the details of this entry.'}
                  </p>
                )}
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

            <TransactionForm
              mode={mode}
              initialTransaction={transaction}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



// feat: add invoice PDF export with jsPDF
// 2026-01-21T15:56:00

// feat: create shared UI components and layout shells
// 2026-02-20T10:31:00

// feat: implement soft delete for transactions and deals
// 2026-03-23T15:06:00

// feat: mock fetch and Redis in service tests
// 2026-04-23T10:41:00

// feat: recompute estimates when transactions change
// 2026-05-23T15:16:00

// feat: add lib/db supabase and redis clients
// 2026-06-23T10:51:00

// feat: polish onboarding success and next steps
// 2026-07-24T15:26:00

// feat: test tax brackets boundary conditions
// 2026-08-23T10:01:00

// feat: set production Auth0 and Stripe callbacks
// 2026-09-23T15:36:00
