'use client';

import { memo } from 'react';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoicePreviewProps {
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate: string;
  billToName: string;
  billToEmail?: string;
  billToAddress?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  lineItems: LineItem[];
  taxRate: number;
  currency: string;
  notes?: string;
  companyName: string;
  companyEmail?: string;
  companyAddress?: string;
}

export const InvoicePreview = memo(function InvoicePreview({
  invoiceNumber,
  invoiceDate,
  dueDate,
  billToName,
  billToEmail,
  billToAddress,
  status = 'draft',
  lineItems,
  taxRate,
  currency,
  notes,
  companyName,
  companyEmail,
  companyAddress,
}: InvoicePreviewProps) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const statusColor =
    status === 'paid'
      ? 'bg-emerald-500/10 text-emerald-500'
      : status === 'overdue'
      ? 'bg-red-500/10 text-red-500'
      : status === 'sent' || status === 'viewed'
      ? 'bg-sky-500/10 text-sky-500'
      : 'bg-muted text-muted-foreground';

  return (
    <section
      className="card glass-surface relative mx-auto w-full max-w-content-lg border border-border bg-card/95 p-4 text-xs text-foreground shadow-soft md:p-6 lg:p-8"
      aria-label="Invoice preview"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">
            {companyName}
          </h1>
          {companyAddress ? (
            <p className="mt-1 max-w-xs text-[11px] text-muted-foreground sm:text-xs">
              {companyAddress}
            </p>
          ) : null}
          {companyEmail ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              {companyEmail}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invoice
          </p>
          {invoiceNumber ? (
            <p className="text-sm font-semibold text-foreground">
              {invoiceNumber}
            </p>
          ) : null}
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground sm:text-xs">
            <p>
              <span className="font-medium text-foreground">
                Date:
              </span>{' '}
              {invoiceDate}
            </p>
            <p>
              <span className="font-medium text-foreground">
                Due:
              </span>{' '}
              {dueDate}
            </p>
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusColor}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status}
          </span>
        </div>
      </header>

      <section className="mb-6 grid gap-4 text-[11px] sm:grid-cols-2 sm:text-xs">
        <div>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Bill to
          </h2>
          <p className="font-medium text-foreground">{billToName}</p>
          {billToEmail ? (
            <p className="text-muted-foreground">{billToEmail}</p>
          ) : null}
          {billToAddress ? (
            <p className="mt-1 max-w-xs whitespace-pre-line text-muted-foreground">
              {billToAddress}
            </p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Summary
          </h2>
          <p className="text-muted-foreground">
            {lineItems.length} line item
            {lineItems.length === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-lg border border-border">
        <table className="min-w-full border-collapse text-[11px] sm:text-xs">
          <thead className="bg-muted/80">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                Description
              </th>
              <th className="w-16 px-3 py-2 text-right font-medium">
                Qty
              </th>
              <th className="w-24 px-3 py-2 text-right font-medium">
                Rate
              </th>
              <th className="w-24 px-3 py-2 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-muted-foreground"
                >
                  Add line items to build your invoice.
                </td>
              </tr>
            ) : (
              lineItems.map((item, index) => (
                <tr
                  key={`${item.description}-${index.toString()}`}
                  className="border-t border-border/60"
                >
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-foreground">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right align-top text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right align-top text-muted-foreground">
                    {item.rate.toLocaleString(undefined, {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-medium">
                    {item.amount.toLocaleString(undefined, {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mb-4 flex flex-col gap-3 text-[11px] sm:flex-row sm:items-start sm:justify-between sm:text-xs">
        {notes ? (
          <div className="max-w-xs">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              Notes
            </h3>
            <p className="whitespace-pre-line text-muted-foreground">
              {notes}
            </p>
          </div>
        ) : (
          <div className="max-w-xs text-muted-foreground">
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide sm:text-xs">
              Payment terms
            </h3>
            <p>
              Please pay within 14 days of the invoice date. Late payments
              may be subject to additional fees.
            </p>
          </div>
        )}

        <dl className="w-full max-w-xs space-y-1 text-right">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">
              {subtotal.toLocaleString(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 2,
              })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">
              Tax ({taxRate.toFixed(1)}%)
            </dt>
            <dd className="font-medium">
              {taxAmount.toLocaleString(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 2,
              })}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              Total
            </dt>
            <dd className="text-sm font-semibold sm:text-base">
              {total.toLocaleString(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 2,
              })}
            </dd>
          </div>
        </dl>
      </section>

      <footer className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-input bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent/10 sm:text-xs print:hidden"
        >
          Download PDF
        </button>
        <button
          type="button"
          className="btn print:hidden"
        >
          Send payment link
        </button>
      </footer>
    </section>
  );
});


