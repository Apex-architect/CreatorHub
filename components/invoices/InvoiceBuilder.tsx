'use client';

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '../../lib/utils/api';
import { InvoicePreview } from './InvoicePreview';

interface LineItemDraft {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface InvoiceBuilderProps {
  initialInvoiceNumber?: string;
  initialStatus?:
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'paid'
    | 'overdue'
    | 'cancelled';
}

function createEmptyItem(): LineItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    rate: 0,
  };
}

export function InvoiceBuilder({
  initialInvoiceNumber,
  initialStatus = 'draft',
}: InvoiceBuilderProps) {
  const queryClient = useQueryClient();

  const [invoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
      .toISOString()
      .slice(0, 10),
  );
  const [billToName, setBillToName] = useState('');
  const [billToEmail, setBillToEmail] = useState('');
  const [billToAddress, setBillToAddress] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [currency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [status] = useState(initialStatus);

  const [items, setItems] = useState<LineItemDraft[]>([
    createEmptyItem(),
  ]);

  const mutation = useMutation<void, ApiError>({
    mutationFn: async () => {
      const payload = {
        invoice_date: invoiceDate,
        due_date: dueDate,
        bill_to_name: billToName,
        bill_to_email: billToEmail || undefined,
        bill_to_address: billToAddress || undefined,
        tax_rate: taxRate,
        line_items: items
          .filter((item) => item.description.trim() !== '')
          .map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
          })),
        notes: notes || undefined,
      };

      await api.post('/api/invoices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const previewItems = useMemo(
    () =>
      items
        .filter((item) => item.description.trim() !== '')
        .map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
        })),
    [items],
  );

  const handleItemChange =
    (id: string, field: keyof LineItemDraft) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value =
        field === 'description'
          ? event.target.value
          : Number(event.target.value || 0);

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item,
        ),
      );
    };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((item) => item.id !== id),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await mutation.mutateAsync();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 lg:flex-row">
      <section className="w-full lg:w-1/2">
        <header className="mb-3 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Invoice builder
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Capture client details and line items; totals update
            instantly while the backend guarantees the source of truth.
          </p>
        </header>

        {mutation.error ? (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
            {mutation.error.message}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
          aria-label="Invoice builder"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Invoice date
              </label>
              <input
                type="date"
                value={invoiceDate}
                className="input"
                disabled
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              Bill to name
            </label>
            <input
              type="text"
              value={billToName}
              onChange={(event) => setBillToName(event.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Bill to email
              </label>
              <input
                type="email"
                value={billToEmail}
                onChange={(event) => setBillToEmail(event.target.value)}
                className="input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Tax rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(event) =>
                  setTaxRate(Number(event.target.value || 0))
                }
                className="input"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              Bill to address
            </label>
            <textarea
              value={billToAddress}
              onChange={(event) => setBillToAddress(event.target.value)}
              rows={2}
              className="input resize-none"
            />
          </div>

          <section aria-label="Line items" className="space-y-2">
            <header className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground sm:text-sm">
                Line items
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent/10 sm:text-xs"
              >
                Add item
              </button>
            </header>

            <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-md bg-background/70 p-2 shadow-inner-subtle sm:flex-row sm:items-end sm:gap-2"
                >
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                      Description
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={handleItemChange(item.id, 'description')}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:w-52 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={handleItemChange(item.id, 'quantity')}
                        className="input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                        Rate
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.rate}
                        onChange={handleItemChange(item.id, 'rate')}
                        className="input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                        Amount
                      </label>
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted px-2 text-[11px] text-muted-foreground sm:text-xs">
                        {(item.quantity * item.rate).toLocaleString(
                          undefined,
                          {
                            style: 'currency',
                            currency,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:self-start">
                    {items.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remove line item"
                        onClick={() => handleRemoveItem(item.id)}
                        className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        ✕
                      </button>
                    )}
                    {!items[index + 1] &&
                      item.description.trim() === '' && (
                        <span className="ml-2 text-[10px] text-muted-foreground sm:text-[11px]">
                          Tip: Press Tab to quickly add the next item.
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Optional details or payment instructions…"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="btn"
            >
              Save invoice
            </button>
          </div>
        </form>
      </section>

      <section className="w-full lg:w-1/2">
        <InvoicePreview
          invoiceNumber={initialInvoiceNumber}
          invoiceDate={invoiceDate}
          dueDate={dueDate}
          billToName={billToName || 'Client name'}
          billToEmail={billToEmail || undefined}
          billToAddress={billToAddress || undefined}
          status={status}
          lineItems={previewItems}
          taxRate={taxRate}
          currency={currency}
          notes={notes || undefined}
          companyName="Creator Business Hub"
          companyEmail="billing@creatorhub.com"
          companyAddress="123 Creator Lane\nInternet City, CA 94110"
        />
      </section>
    </div>
  );
}



// feat: build tax center quarterly estimate engine
// 2026-01-23T17:18:00

// feat: support income and expense type filters
// 2026-02-23T12:53:00

// feat: add search across deal titles and brands
// 2026-03-25T17:28:00

// feat: add path alias configuration for imports
// 2026-04-25T12:03:00

// feat: add year selector on tax and analytics pages
// 2026-05-26T17:38:00

// feat: add database types and shared error utilities
// 2026-06-25T12:13:00

// feat: support timezone preference for reports
// 2026-07-26T17:48:00

// feat: snapshot critical API response shapes
// 2026-08-26T12:23:00

// feat: clean up unused imports and dead code
// 2026-09-25T17:58:00
