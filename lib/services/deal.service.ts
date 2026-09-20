import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

import type { Database } from '../types/database.types';
import {
  createDealSchema,
  updateDealSchema,
} from '../schemas/deal.schema';
import { PaymentService } from './payment.service';
import { logger } from '../utils/logger';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type BrandDealRow = Database['public']['Tables']['brand_deals']['Row'];
type BrandDealInsert = Database['public']['Tables']['brand_deals']['Insert'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];

type DealStatus =
  | 'lead'
  | 'negotiating'
  | 'contracted'
  | 'delivered'
  | 'paid'
  | 'lost';

type CreateDealData = typeof createDealSchema._type;
type UpdateDealData = typeof updateDealSchema._type;

type DealPipeline = Record<DealStatus, BrandDealRow[]>;

export class DealService {
  private readonly supabase: DbClient;

  private readonly paymentService: PaymentService;

  constructor(supabase: DbClient, paymentService: PaymentService) {
    this.supabase = supabase;
    this.paymentService = paymentService;
  }

  async createDeal(
    userId: string,
    rawData: unknown,
  ): Promise<BrandDealRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const data = createDealSchema.parse(rawData) as CreateDealData;

    const insertPayload: BrandDealInsert = {
      user_id: userId,
      brand_name: data.brand_name,
      contact_name: data.contact_name ?? null,
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      status: data.status,
      deal_value: data.deal_value ?? null,
      currency: data.currency,
      payment_terms: data.payment_terms ?? null,
      deliverables: data.deliverables,
      deal_date: data.deal_date ?? null,
      due_date: data.due_date ?? null,
      notes: data.notes ?? null,
    };

    const { data: created, error } = await this.supabase
      .from('brand_deals')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      logger.error('deal.create.failed', error, { userId });
      throw new AppError(500, 'Failed to create deal');
    }

    logger.info('deal.created', {
      userId,
      dealId: created.id,
      status: created.status,
    });

    return created;
  }

  /**
   * Return deals grouped by status for a user's pipeline view.
   */
  async getDeals(
    userId: string,
    status?: DealStatus,
  ): Promise<DealPipeline> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    let query = this.supabase
      .from('brand_deals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('deal.list.failed', error, { userId, status });
      throw new AppError(500, 'Failed to load deals');
    }

    const pipeline: DealPipeline = {
      lead: [],
      negotiating: [],
      contracted: [],
      delivered: [],
      paid: [],
      lost: [],
    };

    for (const deal of data ?? []) {
      const dealStatus = deal.status as DealStatus;
      if (!pipeline[dealStatus]) {
        // Safest fallback: ignore unknown statuses rather than throwing.
        continue;
      }
      pipeline[dealStatus].push(deal);
    }

    return pipeline;
  }

  async getDealById(
    userId: string,
    dealId: string,
  ): Promise<{
    deal: BrandDealRow;
    transactions: TransactionRow[];
  }> {
    if (!userId || !dealId) {
      throw new AppError(400, 'userId and dealId are required');
    }

    const { data: deal, error } = await this.supabase
      .from('brand_deals')
      .select('*')
      .eq('id', dealId)
      .eq('user_id', userId)
      .single();

    if (error || !deal) {
      logger.error('deal.get.failed', error, { userId, dealId });
      throw new NotFoundError('Deal');
    }

    const { data: transactions, error: txError } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_deal_id', dealId);

    if (txError) {
      logger.error('deal.transactions.load_failed', txError, {
        userId,
        dealId,
      });
      throw new AppError(500, 'Failed to load deal transactions');
    }

    return {
      deal,
      transactions: transactions ?? [],
    };
  }

  async updateDeal(
    userId: string,
    dealId: string,
    rawData: unknown,
  ): Promise<BrandDealRow> {
    if (!userId || !dealId) {
      throw new AppError(400, 'userId and dealId are required');
    }

    const data = updateDealSchema.parse(rawData) as UpdateDealData;

    const existing = await this.getDealForUpdate(userId, dealId);

    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not own this deal');
    }

    const previousStatus = existing.status as DealStatus;
    const nextStatus = (data.status ?? existing.status) as DealStatus;

    const { data: updated, error } = await this.supabase
      .from('brand_deals')
      .update({
        brand_name: data.brand_name ?? existing.brand_name,
        contact_name: data.contact_name ?? existing.contact_name,
        contact_email: data.contact_email ?? existing.contact_email,
        contact_phone: data.contact_phone ?? existing.contact_phone,
        status: nextStatus,
        deal_value: data.deal_value ?? existing.deal_value,
        currency: data.currency ?? existing.currency,
        payment_terms: data.payment_terms ?? existing.payment_terms,
        deliverables: data.deliverables ?? existing.deliverables,
        deal_date: data.deal_date ?? existing.deal_date,
        due_date: data.due_date ?? existing.due_date,
        notes: data.notes ?? existing.notes,
      })
      .eq('id', dealId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !updated) {
      logger.error('deal.update.failed', error, { userId, dealId });
      throw new AppError(500, 'Failed to update deal');
    }

    if (previousStatus !== nextStatus) {
      logger.info('deal.status.changed', {
        userId,
        dealId,
        from: previousStatus,
        to: nextStatus,
      });

      if (nextStatus === 'paid') {
        await this.createTransactionFromDeal(userId, updated);
      }
    }

    return updated;
  }

  async deleteDeal(userId: string, dealId: string): Promise<void> {
    if (!userId || !dealId) {
      throw new AppError(400, 'userId and dealId are required');
    }

    const existing = await this.getDealForUpdate(userId, dealId);

    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not own this deal');
    }

    const { error } = await this.supabase
      .from('brand_deals')
      .update({
        // Assumption: soft delete column "deleted_at" exists as TIMESTAMPTZ.
        deleted_at: new Date().toISOString(),
      } as never)
      .eq('id', dealId)
      .eq('user_id', userId);

    if (error) {
      logger.error('deal.delete.failed', error, { userId, dealId });
      throw new AppError(500, 'Failed to delete deal');
    }

    logger.info('deal.deleted', { userId, dealId });
  }

  /**
   * Create exactly one income transaction from a paid deal.
   *
   * - Category is always "sponsorship".
   * - Idempotent: if an income with this brand_deal_id already exists,
   *   the method logs and returns without creating a duplicate.
   */
  private async createTransactionFromDeal(
    userId: string,
    deal: BrandDealRow,
  ): Promise<void> {
    if (!deal.deal_value || deal.deal_value <= 0) {
      logger.warn('deal.paid_without_value', {
        userId,
        dealId: deal.id,
      });
      return;
    }

    const existingTx = await this.findExistingDealIncomeTransaction(
      userId,
      deal.id,
    );

    if (existingTx) {
      logger.info('deal.paid_transaction.already_exists', {
        userId,
        dealId: deal.id,
        transactionId: existingTx.id,
      });
      return;
    }

    const date =
      deal.completed_date ??
      deal.due_date ??
      deal.deal_date ??
      new Date().toISOString().slice(0, 10);

    const payload = {
      date,
      amount: Number(deal.deal_value),
      currency: deal.currency ?? 'USD',
      type: 'income' as const,
      category: 'sponsorship',
      subcategory: undefined,
      description: `Brand deal: ${deal.brand_name}`,
      vendor_name: deal.brand_name,
      receipt_url: undefined,
      tax_deductible: false,
      brand_deal_id: deal.id,
    };

    const transaction = await this.paymentService.createTransaction(
      userId,
      payload,
    );

    logger.info('deal.paid_transaction.created', {
      userId,
      dealId: deal.id,
      transactionId: transaction.id,
    });
  }

  private async getDealForUpdate(
    userId: string,
    dealId: string,
  ): Promise<BrandDealRow> {
    const { data, error } = await this.supabase
      .from('brand_deals')
      .select('*')
      .eq('id', dealId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      logger.error('deal.get_for_update.failed', error, {
        userId,
        dealId,
      });
      throw new NotFoundError('Deal');
    }

    return data;
  }

  private async findExistingDealIncomeTransaction(
    userId: string,
    dealId: string,
  ): Promise<TransactionRow | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_deal_id', dealId)
      .eq('type', 'income')
      .eq('category', 'sponsorship')
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error('deal.income_transaction_lookup.failed', error, {
        userId,
        dealId,
      });
      throw new AppError(
        500,
        'Failed to check existing income transaction for deal',
      );
    }

    return data ?? null;
  }
}



// feat: add deal detail drawer and status transitions
// 2026-01-16T11:12:00

// feat: keep route handlers thin with Zod validation
// 2026-02-15T16:47:00

// feat: create onboarding multi-step form
// 2026-03-18T11:22:00

// feat: unit test invoice total recalculation
// 2026-04-18T16:57:00

// feat: create deal activity timeline scaffold
// 2026-05-18T11:32:00

// feat: build Deals page with pipeline board
// 2026-06-18T16:07:00

// feat: add request id for tracing
// 2026-07-19T11:42:00

// feat: prepare placeholders for future bank sync
// 2026-08-18T16:17:00

// feat: never expose service keys to the client
// 2026-09-18T11:52:00
