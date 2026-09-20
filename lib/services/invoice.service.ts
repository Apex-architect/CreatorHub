import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import jsPDF from 'jspdf';

import type { Database } from '../types/database.types';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
} from '../schemas/invoice.schema';
import { PaymentService } from './payment.service';
import { logger } from '../utils/logger';
import { AppError, NotFoundError } from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];

type CreateInvoiceData = typeof createInvoiceSchema._type;
type UpdateInvoiceData = typeof updateInvoiceSchema._type;

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export class InvoiceService {
  private readonly supabase: DbClient;

  private readonly cache: Redis;

  private readonly paymentService: PaymentService;

  constructor(supabase: DbClient, cache: Redis, paymentService: PaymentService) {
    this.supabase = supabase;
    this.cache = cache;
    this.paymentService = paymentService;
  }

  async createInvoice(
    userId: string,
    rawData: unknown,
  ): Promise<InvoiceRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const payload = createInvoiceSchema.parse(rawData) as CreateInvoiceData;

    const invoiceNumber = await this.generateInvoiceNumber(userId);

    const { subtotal, taxAmount, total } = this.calculateTotals(
      payload.line_items,
      payload.tax_rate,
    );

    const insertPayload: InvoiceInsert = {
      user_id: userId,
      brand_deal_id: payload.brand_deal_id ?? null,
      invoice_number: invoiceNumber,
      invoice_date: payload.invoice_date,
      due_date: payload.due_date,
      bill_to_name: payload.bill_to_name,
      bill_to_email: payload.bill_to_email ?? null,
      bill_to_address: payload.bill_to_address ?? null,
      line_items: payload.line_items as unknown as InvoiceInsert['line_items'],
      subtotal,
      tax_rate: payload.tax_rate,
      tax_amount: taxAmount,
      total,
      currency: 'USD',
      status: 'draft',
      payment_method: null,
      payment_date: null,
      payment_transaction_id: null,
      stripe_payment_link: null,
      notes: payload.notes ?? null,
    };

    const { data, error } = await this.supabase
      .from('invoices')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error || !data) {
      logger.error('invoice.create.failed', error, { userId });
      throw new AppError(500, 'Failed to create invoice');
    }

    logger.info('invoice.created', {
      userId,
      invoiceId: data.id,
      invoiceNumber: data.invoice_number,
    });

    return data;
  }

  async getInvoices(
    userId: string,
    status?: string,
  ): Promise<InvoiceRow[]> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    let query = this.supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('invoice.list.failed', error, { userId, status });
      throw new AppError(500, 'Failed to load invoices');
    }

    return data ?? [];
  }

  async getInvoiceById(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceRow & { payment_transaction?: TransactionRow | null }> {
    if (!userId || !invoiceId) {
      throw new AppError(400, 'userId and invoiceId are required');
    }

    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      logger.error('invoice.get.failed', error, { userId, invoiceId });
      throw new NotFoundError('Invoice');
    }

    let paymentTransaction: TransactionRow | null = null;

    if (data.payment_transaction_id) {
      const { data: tx, error: txError } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('id', data.payment_transaction_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (txError) {
        logger.error('invoice.payment_transaction.load_failed', txError, {
          userId,
          invoiceId,
        });
      } else {
        paymentTransaction = tx ?? null;
      }
    }

    return {
      ...data,
      payment_transaction: paymentTransaction,
    };
  }

  async updateInvoice(
    userId: string,
    invoiceId: string,
    rawData: unknown,
  ): Promise<InvoiceRow> {
    if (!userId || !invoiceId) {
      throw new AppError(400, 'userId and invoiceId are required');
    }

    const payload = updateInvoiceSchema.parse(rawData) as UpdateInvoiceData;

    const existing = await this.getInvoiceCore(userId, invoiceId);

    const nextLineItems =
      payload.line_items ?? (existing.line_items as unknown as LineItem[]);
    const nextTaxRate = payload.tax_rate ?? existing.tax_rate ?? 0;

    const { subtotal, taxAmount, total } = this.calculateTotals(
      nextLineItems,
      nextTaxRate,
    );

    const previousStatus = existing.status;
    const nextStatus = payload.status ?? existing.status;

    const { data, error } = await this.supabase
      .from('invoices')
      .update({
        brand_deal_id:
          payload.brand_deal_id !== undefined
            ? payload.brand_deal_id
            : existing.brand_deal_id,
        invoice_date: payload.invoice_date ?? existing.invoice_date,
        due_date: payload.due_date ?? existing.due_date,
        bill_to_name: payload.bill_to_name ?? existing.bill_to_name,
        bill_to_email: payload.bill_to_email ?? existing.bill_to_email,
        bill_to_address: payload.bill_to_address ?? existing.bill_to_address,
        line_items: nextLineItems as unknown as InvoiceInsert['line_items'],
        subtotal,
        tax_rate: nextTaxRate,
        tax_amount: taxAmount,
        total,
        status: nextStatus,
        payment_method: payload.payment_method ?? existing.payment_method,
        payment_date: payload.payment_date ?? existing.payment_date,
        notes: payload.notes ?? existing.notes,
      })
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      logger.error('invoice.update.failed', error, { userId, invoiceId });
      throw new AppError(500, 'Failed to update invoice');
    }

    logger.info('invoice.updated', {
      userId,
      invoiceId: data.id,
      status: data.status,
    });

    if (previousStatus !== 'paid' && data.status === 'paid') {
      await this.recordPaymentIfNeeded(userId, data);
    }

    return data;
  }

  async generatePDF(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceCore(userId, invoiceId);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Invoice', 20, 20);

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 30);
    doc.text(`Date: ${invoice.invoice_date}`, 20, 36);
    doc.text(`Due: ${invoice.due_date}`, 20, 42);

    doc.text('Bill To:', 20, 54);
    doc.text(invoice.bill_to_name ?? '', 20, 60);
    if (invoice.bill_to_email) {
      doc.text(invoice.bill_to_email, 20, 66);
    }
    if (invoice.bill_to_address) {
      const lines = doc.splitTextToSize(invoice.bill_to_address, 170);
      doc.text(lines, 20, 72);
    }

    let y = 100;
    doc.setFontSize(11);
    doc.text('Description', 20, y);
    doc.text('Qty', 120, y);
    doc.text('Rate', 140, y);
    doc.text('Amount', 170, y, { align: 'right' });
    y += 6;

    const lineItems = invoice.line_items as unknown as LineItem[];
    doc.setFontSize(10);
    for (const item of lineItems) {
      const descLines = doc.splitTextToSize(item.description, 90);
      doc.text(descLines, 20, y);
      doc.text(String(item.quantity), 120, y);
      doc.text(item.rate.toFixed(2), 140, y);
      doc.text(item.amount.toFixed(2), 170, y, { align: 'right' });
      y += descLines.length * 5;
    }

    y += 10;
    doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, 170, y, {
      align: 'right',
    });
    y += 6;
    doc.text(`Tax: ${invoice.tax_amount.toFixed(2)}`, 170, y, {
      align: 'right',
    });
    y += 6;
    doc.setFontSize(12);
    doc.text(`Total: ${invoice.total.toFixed(2)}`, 170, y, {
      align: 'right',
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    logger.info('invoice.pdf.generated', {
      userId,
      invoiceId,
    });

    return pdfBuffer;
  }

  async generateInvoiceNumber(userId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prefix = `INV-${year}${month.toString().padStart(2, '0')}-`;

    // Count existing invoices for this user and month.
    const { count, error } = await this.supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .like('invoice_number', `${prefix}%`);

    if (error) {
      logger.error('invoice.number.count_failed', error, { userId, prefix });
      throw new AppError(500, 'Failed to generate invoice number');
    }

    const next = (count ?? 0) + 1;
    const number = `${prefix}${next.toString().padStart(4, '0')}`;

    return number;
  }

  private calculateTotals(lineItems: LineItem[], taxRate: number) {
    // Never trust client amounts: recompute line item amounts and totals.
    const normalized = lineItems.map((item) => {
      const amount = item.quantity * item.rate;
      return { ...item, amount };
    });

    const subtotal = normalized.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    return {
      subtotal,
      taxAmount,
      total,
    };
  }

  private async getInvoiceCore(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceRow> {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      logger.error('invoice.get_core.failed', error, { userId, invoiceId });
      throw new NotFoundError('Invoice');
    }

    return data;
  }

  private async recordPaymentIfNeeded(
    userId: string,
    invoice: InvoiceRow,
  ): Promise<void> {
    if (invoice.payment_transaction_id) {
      return;
    }

    if (!invoice.payment_date) {
      logger.warn('invoice.paid_without_payment_date', {
        userId,
        invoiceId: invoice.id,
      });
      return;
    }

    const payload = {
      date: invoice.payment_date,
      amount: Number(invoice.total),
      currency: invoice.currency ?? 'USD',
      type: 'income' as const,
      category: 'sponsorship',
      subcategory: undefined,
      description: `Invoice ${invoice.invoice_number}`,
      vendor_name: invoice.bill_to_name,
      receipt_url: undefined,
      tax_deductible: false,
      brand_deal_id: invoice.brand_deal_id ?? undefined,
    };

    const transaction = await this.paymentService.createTransaction(
      userId,
      payload,
    );

    const { error } = await this.supabase
      .from('invoices')
      .update({
        payment_transaction_id: transaction.id,
      })
      .eq('id', invoice.id)
      .eq('user_id', userId);

    if (error) {
      logger.error('invoice.payment.link_failed', error, {
        userId,
        invoiceId: invoice.id,
        transactionId: transaction.id,
      });
      throw new AppError(
        500,
        'Failed to link payment transaction to invoice',
      );
    }

    logger.info('invoice.payment.recorded', {
      userId,
      invoiceId: invoice.id,
      transactionId: transaction.id,
    });
  }
}



// feat: add create and edit transaction modal
// 2026-01-12T18:39:00

// feat: add keyboard shortcuts across dashboard
// 2026-02-12T13:14:00

// feat: protect dashboard and API routes at the edge
// 2026-03-14T18:49:00

// feat: write test documentation and coverage plan
// 2026-04-14T13:24:00

// feat: link invoices to brand deals optionally
// 2026-05-15T18:59:00

// feat: align dashboard routes with sidebar paths
// 2026-06-14T13:34:00

// feat: add notes field on tax settings
// 2026-07-15T18:09:00

// feat: show unmatched Stripe payments in a queue
// 2026-08-15T13:44:00

// feat: compare period-over-period revenue
// 2026-09-14T18:19:00
