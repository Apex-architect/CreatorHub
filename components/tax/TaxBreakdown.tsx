'use client';

import { memo } from 'react';

interface TaxBreakdownProps {
  year: number;
  incomeTotal: number;
  deductibleExpensesTotal: number;
  netIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  totalEstimatedTax: number;
  byCategory: Record<string, number>;
}

export const TaxBreakdown = memo(function TaxBreakdown({
  year,
  incomeTotal,
  deductibleExpensesTotal,
  netIncome,
  selfEmploymentTax,
  federalIncomeTax,
  totalEstimatedTax,
  byCategory,
}: TaxBreakdownProps) {
  const effectiveRate =
    incomeTotal > 0 ? (totalEstimatedTax / incomeTotal) * 100 : 0;

  const categories = Object.entries(byCategory).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <section
      className="card flex flex-col gap-4 p-4 sm:p-5"
      aria-label={`Tax summary for ${year}`}
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold sm:text-base">
            Tax summary
          </h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Plain-language view of how your estimated tax is calculated.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-[11px] sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-foreground">
            Confidence:&nbsp;
          </span>
          <span className="text-muted-foreground">
            High (simplified estimate)
          </span>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <dl className="space-y-1 rounded-lg bg-muted/60 p-3 text-[11px] sm:text-xs">
          <dt className="text-muted-foreground">Total income</dt>
          <dd className="text-sm font-semibold sm:text-base">
            {incomeTotal.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
          <dt className="mt-2 text-muted-foreground">
            Deductible expenses
          </dt>
          <dd className="font-medium text-emerald-500">
            −
            {deductibleExpensesTotal.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
          <dt className="mt-2 text-muted-foreground">Net income</dt>
          <dd className="font-semibold">
            {netIncome.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
        </dl>

        <dl className="space-y-1 rounded-lg bg-muted/40 p-3 text-[11px] sm:text-xs">
          <dt className="text-muted-foreground">Self-employment tax</dt>
          <dd className="font-semibold">
            {selfEmploymentTax.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline">
              How this is calculated
            </summary>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              We multiply your net income by the standard self-employment
              tax formulas used in the U.S. (social security and
              Medicare). This is an estimate and does not include all
              edge cases.
            </p>
          </details>

          <dt className="mt-3 text-muted-foreground">
            Federal income tax
          </dt>
          <dd className="font-semibold">
            {federalIncomeTax.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline">
              How this is calculated
            </summary>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              We apply progressive tax brackets to your estimated net
              income based on your filing status. This gives you a
              directional estimate and is not a final tax return.
            </p>
          </details>
        </dl>

        <dl className="space-y-1 rounded-lg bg-muted/40 p-3 text-[11px] sm:text-xs">
          <dt className="text-muted-foreground">Total estimated tax</dt>
          <dd className="text-sm font-semibold sm:text-base">
            {totalEstimatedTax.toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </dd>
          <dt className="mt-2 text-muted-foreground">
            Effective tax rate
          </dt>
          <dd className="font-semibold">
            {effectiveRate.toFixed(1)}%
          </dd>
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:underline">
              What this means
            </summary>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              This is your estimated total tax divided by total income.
              It&apos;s a quick way to sanity-check whether your set-aside
              rate feels realistic.
            </p>
          </details>
        </dl>
      </section>

      <section
        aria-label="Deductible expense breakdown"
        className="space-y-2 rounded-lg border border-border/70 bg-card/70 p-3 text-[11px] sm:text-xs"
      >
        <header className="flex items-center justify-between">
          <h3 className="font-semibold text-muted-foreground">
            Deductible expenses by category
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {categories.length} categories
          </span>
        </header>
        {categories.length === 0 ? (
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            We haven&apos;t detected any deductible expenses for this
            year yet. As you categorize expenses as tax-deductible,
            they will appear here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {categories.map(([category, amount]) => {
              const pct =
                deductibleExpensesTotal > 0
                  ? (amount / deductibleExpensesTotal) * 100
                  : 0;
              return (
                <li
                  key={category}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground sm:text-xs">
                        {category}
                      </span>
                      <span className="text-[11px] text-muted-foreground sm:text-xs">
                        {amount.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        })}{' '}
                        • {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-label="Important tax warning"
        className="mt-1 flex items-start gap-2 rounded-md border border-amber-400/70 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900 sm:text-xs dark:border-amber-300/60 dark:bg-amber-900/20 dark:text-amber-100"
      >
        <span className="mt-0.5 text-sm" aria-hidden>
          ⚠️
        </span>
        <div>
          <p className="font-semibold">This is an estimate, not advice.</p>
          <p className="mt-0.5">
            Creator Business Hub does not provide tax, legal, or accounting
            advice. Use this view to stay informed and work with a qualified
            professional before making payment decisions.
          </p>
        </div>
      </section>
    </section>
  );
}


