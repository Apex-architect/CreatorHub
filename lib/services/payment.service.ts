import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import type Stripe from 'stripe';
import { z } from 'zod';

import type { Database } from '../types/database.types';
import {
  createTransactionSchema,
  transactionFiltersSchema,
  updateTransactionSchema,
} from '../schemas/transaction.schema';
import {
  CATEGORY_PATTERNS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../config/categories';
import { cacheKey } from '../utils/cache';
import { logger } from '../utils/logger';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionsTable = Database['public']['Tables']['transactions'];

type CreateTransactionData = z.infer<typeof createTransactionSchema>;
type UpdateTransactionData = z.infer<typeof updateTransactionSchema>;
type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

const TRANSACTION_LIST_TTL_SECONDS = 60;

interface PaginatedTransactions {
  data: TransactionRow[];
  total: number;
  limit: number;
  offset: number;
}

export class PaymentService {
  private readonly supabase: DbClient;

  private readonly cache: Redis;

  constructor(supabase: DbClient, cache: Redis) {
    this.supabase = supabase;
    this.cache = cache;
  }

  /**
   * Create a new transaction for a user.
   *
   * Safest assumptions:
   * - We always enforce user_id at the service layer (even when the Supabase
   *   client is using a service role key and could bypass RLS).
   * - Soft delete is implemented via a nullable "deleted_at" column on the
   *   transactions table, even though it is not shown in the initial schema.
   */
  async createTransaction(
    userId: string,
    rawData: unknown,
  ): Promise<TransactionRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const parsed = createTransactionSchema.parse(rawData);

    const category =
      parsed.category ??
      this.categorizeTransaction(
        parsed.type,
        parsed.description ?? '',
        parsed.vendor_name ?? '',
      );

    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: parsed.date,
        amount: parsed.amount,
        currency: parsed.currency,
        type: parsed.type,
        category,
        subcategory: parsed.subcategory,
        description: parsed.description,
        vendor_name: parsed.vendor_name,
        receipt_url: parsed.receipt_url,
        tax_deductible: parsed.tax_deductible,
        brand_deal_id: parsed.brand_deal_id ?? null,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('transaction.create.failed', error, { userId });
      throw new AppError(500, 'Failed to create transaction');
    }

    await this.invalidateTransactionListCache(userId);

    logger.info('transaction.created', {
      userId,
      transactionId: data.id,
    });

    return data;
  }

  /**
   * Get a paginated list of transactions for a user.
   * Results are cached by user and filter set.
   */
  async getTransactions(
    userId: string,
    filtersInput: unknown,
  ): Promise<PaginatedTransactions> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const filters = transactionFiltersSchema.parse(filtersInput);

    const key = this.transactionListCacheKey(userId, filters);
    const cached = await this.cache.get<string | null>(key);

    if (cached) {
      try {
        const parsed: PaginatedTransactions = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('transaction.list.cache.parse_failed', { key });
      }
    }

    const baseQuery = this.supabase
      .from('transactions')
      .select(
        'id, user_id, date, amount, currency, type, category, subcategory, description, vendor_name, receipt_url, tax_deductible, brand_deal_id, invoice_id, created_at',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (filters.type) {
      baseQuery.eq('type', filters.type);
    }
    if (filters.category) {
      baseQuery.eq('category', filters.category);
    }
    if (filters.start_date) {
      baseQuery.gte('date', filters.start_date);
    }
    if (filters.end_date) {
      baseQuery.lte('date', filters.end_date);
    }

    const { data, error, count } = await baseQuery
      .order('date', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    if (error) {
      logger.error('transaction.list.failed', error, { userId });
      throw new AppError(500, 'Failed to load transactions');
    }

    const result: PaginatedTransactions = {
      data: data ?? [],
      total: count ?? 0,
      limit: filters.limit,
      offset: filters.offset,
    };

    await this.cache.setex(
      key,
      TRANSACTION_LIST_TTL_SECONDS,
      JSON.stringify(result),
    );

    return result;
  }

  /**
   * Get a single transaction, enforcing ownership.
   */
  async getTransactionById(
    userId: string,
    transactionId: string,
  ): Promise<TransactionRow> {
    if (!userId || !transactionId) {
      throw new AppError(400, 'userId and transactionId are required');
    }

    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error) {
      logger.error('transaction.get.failed', error, {
        userId,
        transactionId,
      });
      throw new NotFoundError('Transaction');
    }

    if (!data) {
      throw new NotFoundError('Transaction');
    }

    return data;
  }

  /**
   * Update an existing transaction, enforcing ownership and soft-delete rules.
   */
  async updateTransaction(
    userId: string,
    transactionId: string,
    rawData: unknown,
  ): Promise<TransactionRow> {
    if (!userId || !transactionId) {
      throw new AppError(400, 'userId and transactionId are required');
    }

    const parsed = updateTransactionSchema.parse(rawData);

    const existing = await this.getTransactionById(userId, transactionId);
    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not own this transaction');
    }

    if (existing.deleted_at) {
      throw new AppError(400, 'Cannot update a deleted transaction');
    }

    const nextCategory =
      parsed.category ??
      existing.category ??
      this.categorizeTransaction(
        parsed.type ?? existing.type,
        parsed.description ?? existing.description ?? '',
        parsed.vendor_name ?? existing.vendor_name ?? '',
      );

    const { data, error } = await this.supabase
      .from('transactions')
      .update({
        date: parsed.date ?? existing.date,
        amount: parsed.amount ?? existing.amount,
        currency: parsed.currency ?? existing.currency,
        type: parsed.type ?? existing.type,
        category: nextCategory,
        subcategory: parsed.subcategory ?? existing.subcategory,
        description: parsed.description ?? existing.description,
        vendor_name: parsed.vendor_name ?? existing.vendor_name,
        receipt_url: parsed.receipt_url ?? existing.receipt_url,
        tax_deductible: parsed.tax_deductible ?? existing.tax_deductible,
        brand_deal_id:
          parsed.brand_deal_id !== undefined
            ? parsed.brand_deal_id
            : existing.brand_deal_id,
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error('transaction.update.failed', error, {
        userId,
        transactionId,
      });
      throw new AppError(500, 'Failed to update transaction');
    }

    await this.invalidateTransactionListCache(userId);

    logger.info('transaction.updated', {
      userId,
      transactionId: data.id,
    });

    return data;
  }

  /**
   * Soft delete a transaction by setting deleted_at, enforcing ownership.
   */
  async deleteTransaction(
    userId: string,
    transactionId: string,
  ): Promise<void> {
    if (!userId || !transactionId) {
      throw new AppError(400, 'userId and transactionId are required');
    }

    const existing = await this.getTransactionById(userId, transactionId);
    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not own this transaction');
    }

    if (existing.deleted_at) {
      // Already deleted; treat as success.
      return;
    }

    const { error } = await this.supabase
      .from('transactions')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .eq('user_id', userId);

    if (error) {
      logger.error('transaction.delete.failed', error, {
        userId,
        transactionId,
      });
      throw new AppError(500, 'Failed to delete transaction');
    }

    await this.invalidateTransactionListCache(userId);

    logger.info('transaction.deleted', {
      userId,
      transactionId,
    });
  }

  /**
   * Process a Stripe webhook event.
   * All Stripe-specific logic is funneled through this method so that
   * route handlers remain minimal and focused on HTTP concerns only.
   */
  async processStripeEvent(event: Stripe.Event): Promise<void> {
    logger.info('stripe.event.received', {
      id: event.id,
      type: event.type,
    });

    if (event.type === 'charge.succeeded') {
      await this.handleStripeChargeSucceeded(event);
      return;
    }

    // For MVP we ignore other event types but still log them.
    logger.info('stripe.event.ignored', { type: event.type });
  }

  /**
   * Handle a successful charge event from Stripe and create an idempotent
   * income transaction for the associated user.
   *
   * Safest assumptions (documented):
   * - We rely on charge.metadata.user_id for mapping the Stripe charge
   *   back to an internal user; if absent, we log and skip processing.
   * - Amounts are provided in the smallest currency unit (e.g. cents)
   *   and converted to a decimal using 2 fraction digits.
   * - We enforce idempotency by checking for an existing transaction with
   *   the same (user_id, source = 'stripe', source_id = charge.id).
   */
  private async handleStripeChargeSucceeded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;

    const userId = charge.metadata?.user_id;
    if (!userId) {
      logger.warn('stripe.charge_succeeded.missing_user_id', {
        chargeId: charge.id,
      });
      return;
    }

    // Idempotency: never create a duplicate transaction for the same charge.
    const existing = await this.findExistingStripeTransaction(userId, charge.id);
    if (existing) {
      logger.info('stripe.charge_succeeded.duplicate_ignored', {
        userId,
        chargeId: charge.id,
        transactionId: existing.id,
      });
      return;
    }

    const amount =
      typeof charge.amount === 'number' ? charge.amount / 100 : 0;

    if (amount <= 0) {
      logger.warn('stripe.charge_succeeded.non_positive_amount', {
        userId,
        chargeId: charge.id,
        amount: charge.amount,
      });
      return;
    }

    const currency = (charge.currency ?? 'usd').toUpperCase();
    const description =
      charge.description ??
      charge.statement_descriptor ??
      'Stripe charge';
    const vendorName =
      charge.billing_details?.name ??
      charge.billing_details?.email ??
      'Stripe';

    const category = this.categorizeTransaction(
      'income',
      description,
      vendorName,
    );

    const insertPayload: TransactionsTable['Insert'] = {
      user_id: userId,
      date: new Date(charge.created * 1000).toISOString().slice(0, 10),
      amount,
      currency,
      type: 'income',
      category,
      subcategory: null,
      source: 'stripe',
      source_id: charge.id,
      source_metadata: charge as unknown as TransactionsTable['Insert']['source_metadata'],
      description,
      vendor_name: vendorName,
      tax_deductible: false,
      brand_deal_id: null,
      invoice_id: null,
      receipt_url: null,
    };

    const { data, error } = await this.supabase
      .from('transactions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      logger.error('stripe.charge_succeeded.insert_failed', error, {
        userId,
        chargeId: charge.id,
      });
      throw new AppError(500, 'Failed to record Stripe transaction');
    }

    await this.invalidateTransactionListCache(userId);

    logger.info('stripe.charge_succeeded.recorded', {
      userId,
      chargeId: charge.id,
      transactionId: data.id,
    });
  }

  /**
   * Rule-based categorization based on transaction type, description,
   * and vendor name.
   */
  categorizeTransaction(
    type: 'income' | 'expense',
    description: string,
    vendorName: string,
  ): string {
    const text = `${description} ${vendorName}`.toLowerCase();

    for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    if (type === 'income') {
      return INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
    }

    return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  }

  private transactionListCacheKey(
    userId: string,
    filters: TransactionFilters,
  ): string {
    const filterHash = JSON.stringify({
      type: filters.type,
      category: filters.category,
      start_date: filters.start_date,
      end_date: filters.end_date,
      limit: filters.limit,
      offset: filters.offset,
    });

    return cacheKey('transactions:list', userId, filterHash);
  }

  private async invalidateTransactionListCache(userId: string): Promise<void> {
    // Safest assumption: cache keys for transaction lists are prefixed with
    // "transactions:list:{userId}", so we can use a pattern delete here.
    const pattern = cacheKey('transactions:list', userId, '*');
    const keys = await this.cache.keys(pattern);
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }

  private async findExistingStripeTransaction(
    userId: string,
    chargeId: string,
  ): Promise<TransactionRow | null> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'stripe')
      .eq('source_id', chargeId)
      .maybeSingle();

    if (error) {
      logger.error('stripe.transaction_lookup.failed', error, {
        userId,
        chargeId,
      });
      throw new AppError(500, 'Failed to check existing Stripe transaction');
    }

    return data ?? null;
  }
}



// feat: implement transaction CRUD API routes
// 2026-01-13T09:50:00

// feat: show demo-mode banner when enabled
// 2026-02-13T14:25:00

// feat: exclude auth and health from rate limit and auth
// 2026-03-16T09:00:00

// feat: add Jest config with 80 percent coverage threshold
// 2026-04-15T14:35:00

// feat: show deal value and expected close date
// 2026-05-16T09:10:00

// feat: add landing page and root layout
// 2026-06-16T14:45:00

// feat: cache invalidation on relevant writes
// 2026-07-16T09:20:00

// feat: create integration settings panel
// 2026-08-16T14:55:00

// feat: highlight top expense categories
// 2026-09-16T09:30:00
