'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from '../../../lib/utils/api';
import { TaxBreakdown } from '../../../components/tax/TaxBreakdown';
import { TransactionListSkeleton } from '../../../components/transactions/TransactionListSkeleton';

interface TaxSummaryResponse {
  year: number;
  incomeTotal: number;
  deductibleExpensesTotal: number;
  netIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  totalEstimatedTax: number;
  byCategory: Record<string, number>;
}

interface TaxEstimateResponse {
  year: number;
  quarter: number;
  incomeTotal: number;
  deductibleExpensesTotal: number;
  netIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  totalEstimatedTax: number;
  quarterlyPaymentAmount: number;
  dueDate: string;
}

function TaxContent() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const summaryQuery = useQuery<TaxSummaryResponse, ApiError>({
    queryKey: ['tax', 'summary', year],
    queryFn: () =>
      api.get<TaxSummaryResponse>(`/api/tax/summary?year=${year}`),
  });

  const quarterlyQuery = useQuery<TaxEstimateResponse[], ApiError>({
    queryKey: ['tax', 'estimate', year],
    queryFn: async () => {
      const quarters = [1, 2, 3, 4] as const;
      const results = await Promise.all(
        quarters.map((q) =>
          api.get<TaxEstimateResponse>(
            `/api/tax/estimate?year=${year}&quarter=${q}`,
          ),
        ),
      );
      return results;
    },
  });

  const isLoading = summaryQuery.isLoading || quarterlyQuery.isLoading;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
      <header className="mb-1 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Tax summary
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          A calm, plain-language view of your estimated tax position.
        </p>
      </header>

      {summaryQuery.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
          {summaryQuery.error.message}
        </div>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>We show estimates, not advice. You stay in control.</span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-muted-foreground sm:text-xs">
            Year
          </label>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-[11px] shadow-inner-subtle sm:text-xs"
          >
            {[currentYear, currentYear - 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </section>

      {summaryQuery.data && (
        <TaxBreakdown
          year={summaryQuery.data.year}
          incomeTotal={summaryQuery.data.incomeTotal}
          deductibleExpensesTotal={
            summaryQuery.data.deductibleExpensesTotal
          }
          netIncome={summaryQuery.data.netIncome}
          selfEmploymentTax={summaryQuery.data.selfEmploymentTax}
          federalIncomeTax={summaryQuery.data.federalIncomeTax}
          totalEstimatedTax={summaryQuery.data.totalEstimatedTax}
          byCategory={summaryQuery.data.byCategory}
        />
      )}

      <section
        aria-label="Quarterly overview"
        className="grid gap-3 md:grid-cols-2"
      >
        {quarterlyQuery.data?.map((q) => (
          <article
            key={q.quarter}
            className="card flex flex-col justify-between gap-2 p-3 sm:p-4"
          >
            <header className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  Q{q.quarter} {q.year}
                </h2>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Payment due by {q.dueDate}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 sm:text-[11px]">
                Recommended set-aside
              </span>
            </header>
            <dl className="space-y-1 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Estimated payment</dt>
                <dd className="font-semibold">
                  {q.quarterlyPaymentAmount.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Quarter income</dt>
                <dd>
                  {q.incomeTotal.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">
                  Deductible expenses
                </dt>
                <dd>
                  {q.deductibleExpensesTotal.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              This is the amount you might want to set aside to feel
              comfortable when tax time comes. Adjust together with
              your accountant as needed.
            </p>
          </article>
        ))}
      </section>

      {isLoading && (
        <div className="sr-only" aria-live="polite">
          Loading tax details…
        </div>
      )}
    </div>
  );
}

export default function TaxPage() {
  return (
    <Suspense fallback={<TransactionListSkeleton />}>
      <TaxContent />
    </Suspense>
  );
}


