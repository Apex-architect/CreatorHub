'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  FormEvent,
  ChangeEvent,
} from 'react';
import { z } from 'zod';
import { motion, useReducedMotion } from 'framer-motion';

import type { TransactionRow } from './types';

const formSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .min(1, 'Date is required'),
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .positive('Amount must be greater than zero')
    .max(1_000_000, 'Amount is too large'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('USD'),
  type: z.enum(['income', 'expense'], {
    required_error: 'Type is required',
  }),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  description: z.string().max(500).optional(),
  vendor_name: z.string().max(255).optional(),
  receipt_url: z.string().url('Receipt must be a valid URL').optional(),
  tax_deductible: z.boolean().optional(),
  brand_deal_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface TransactionFormProps {
  mode: 'create' | 'edit';
  initialTransaction?: TransactionRow;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

export function TransactionForm({
  mode,
  initialTransaction,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const prefersReducedMotion = useReducedMotion();
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const initialValues: FormValues = useMemo(() => {
    if (initialTransaction) {
      return {
        date: initialTransaction.date,
        amount: Number(initialTransaction.amount),
        currency: initialTransaction.currency ?? 'USD',
        type: initialTransaction.type,
        category: initialTransaction.category ?? '',
        subcategory: initialTransaction.subcategory ?? undefined,
        description: initialTransaction.description ?? undefined,
        vendor_name: initialTransaction.vendor_name ?? undefined,
        receipt_url: initialTransaction.receipt_url ?? undefined,
        tax_deductible: Boolean(initialTransaction.tax_deductible),
        brand_deal_id: initialTransaction.brand_deal_id ?? undefined,
      };
    }

    const today = new Date();
    const iso = today.toISOString().slice(0, 10);

    return {
      date: iso,
      amount: 0,
      currency: 'USD',
      type: 'income',
      category: '',
      subcategory: undefined,
      description: undefined,
      vendor_name: undefined,
      receipt_url: undefined,
      tax_deductible: false,
      brand_deal_id: undefined,
    };
  }, [initialTransaction]);

  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dateInputRef.current?.focus();
  }, []);

  const handleChange =
    (field: keyof FormValues) =>
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLSelectElement>
        | ChangeEvent<HTMLTextAreaElement>,
    ) => {
      const value = event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value;

      setValues((prev) => {
        if (field === 'amount') {
          const numeric =
            value === '' ? 0 : Number((value as string).replace(/,/g, ''));
          return { ...prev, amount: numeric };
        }
        return { ...prev, [field]: value };
      });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validateField = (field: keyof FormValues) => {
    try {
      formSchema.pick({ [field]: true }).parse({
        [field]: values[field],
      });
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.issues[0]?.message ?? 'Invalid value';
        setErrors((prev) => ({ ...prev, [field]: message }));
      }
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = formSchema.parse(values);
      setSubmitting(true);
      await onSubmit(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FieldErrors = {};
        for (const issue of error.issues) {
          const key = issue.path[0] as keyof FormValues;
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit}
      noValidate
      aria-label={
        mode === 'create'
          ? 'Create transaction'
          : 'Edit transaction'
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Date"
          required
          error={errors.date}
        >
          <input
            ref={dateInputRef}
            type="date"
            value={values.date}
            onChange={handleChange('date')}
            onBlur={() => validateField('date')}
            className="input"
            aria-invalid={Boolean(errors.date)}
          />
        </Field>

        <Field
          label="Amount"
          required
          error={errors.amount}
        >
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={values.amount === 0 ? '' : values.amount}
              onChange={handleChange('amount')}
              onBlur={() => validateField('amount')}
              className="input"
              aria-invalid={Boolean(errors.amount)}
            />
            <input
              type="text"
              value={values.currency}
              onChange={handleChange('currency')}
              onBlur={() => validateField('currency')}
              className="w-20 rounded-md border border-input bg-background px-2 text-xs shadow-inner-subtle sm:text-sm"
              aria-label="Currency"
              aria-invalid={Boolean(errors.currency)}
            />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          label="Type"
          required
          error={errors.type}
        >
          <select
            value={values.type}
            onChange={handleChange('type')}
            onBlur={() => validateField('type')}
            className="input"
            aria-invalid={Boolean(errors.type)}
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </Field>

        <Field
          label="Category"
          required
          error={errors.category}
        >
          <input
            type="text"
            value={values.category}
            onChange={handleChange('category')}
            onBlur={() => validateField('category')}
            className="input"
            aria-invalid={Boolean(errors.category)}
          />
        </Field>

        <Field
          label="Subcategory"
          error={errors.subcategory}
        >
          <input
            type="text"
            value={values.subcategory ?? ''}
            onChange={handleChange('subcategory')}
            onBlur={() => validateField('subcategory')}
            className="input"
            aria-invalid={Boolean(errors.subcategory)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Vendor"
          error={errors.vendor_name}
        >
          <input
            type="text"
            value={values.vendor_name ?? ''}
            onChange={handleChange('vendor_name')}
            onBlur={() => validateField('vendor_name')}
            className="input"
            aria-invalid={Boolean(errors.vendor_name)}
          />
        </Field>

        <Field
          label="Receipt URL"
          error={errors.receipt_url}
        >
          <input
            type="url"
            value={values.receipt_url ?? ''}
            onChange={handleChange('receipt_url')}
            onBlur={() => validateField('receipt_url')}
            placeholder="https://..."
            className="input"
            aria-invalid={Boolean(errors.receipt_url)}
          />
        </Field>
      </div>

      <Field
        label="Description"
        error={errors.description}
      >
        <textarea
          value={values.description ?? ''}
          onChange={handleChange('description')}
          onBlur={() => validateField('description')}
          rows={3}
          className="input resize-none"
          aria-invalid={Boolean(errors.description)}
        />
      </Field>

      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <input
            type="checkbox"
            checked={Boolean(values.tax_deductible)}
            onChange={handleChange('tax_deductible')}
            className="h-4 w-4 rounded border-input text-primary"
          />
          Tax deductible
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/10 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn"
          >
            {mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  const prefersReducedMotion = useReducedMotion();
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
      >
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -2 }}
        animate={
          error && !prefersReducedMotion
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: -2 }
        }
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="min-h-[14px] text-[11px] text-destructive sm:text-xs"
        aria-live="polite"
      >
        {error ?? ''}
      </motion.div>
    </div>
  );
}


