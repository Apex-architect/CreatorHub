import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import { z } from 'zod';

import type { Database } from '../types/database.types';
import {
  taxEstimateQuerySchema,
  taxSettingsSchema,
} from '../schemas/tax.schema';
import { TAX_BRACKETS_2026, SE_DEDUCTION_RATE, SELF_EMPLOYMENT_TAX_RATE } from '../config/tax-brackets';
import { cacheKey } from '../utils/cache';
import { logger } from '../utils/logger';
import { AppError, NotFoundError } from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TaxSettingsRow = Database['public']['Tables']['tax_settings']['Row'];

type TaxSettingsData = z.infer<typeof taxSettingsSchema>;
type TaxEstimateQuery = z.infer<typeof taxEstimateQuerySchema>;

interface TaxBreakdown {
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

interface YearSummary {
  year: number;
  incomeTotal: number;
  deductibleExpensesTotal: number;
  netIncome: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  totalEstimatedTax: number;
  byCategory: Record<string, number>;
}

export class TaxService {
  private readonly supabase: DbClient;

  private readonly cache: Redis;

  constructor(supabase: DbClient, cache: Redis) {
    this.supabase = supabase;
    this.cache = cache;
  }

  async calculateQuarterlyEstimate(
    userId: string,
    queryInput: unknown,
  ): Promise<TaxBreakdown> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const query = taxEstimateQuerySchema.parse(queryInput) as TaxEstimateQuery;

    const cacheKeyStr = cacheKey(
      'tax:estimate',
      userId,
      String(query.year),
      String(query.quarter),
    );

    const cached = await this.cache.get<string | null>(cacheKeyStr);
    if (cached) {
      try {
        const parsed: TaxBreakdown = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('tax.estimate.cache.parse_failed', { cacheKey: cacheKeyStr });
      }
    }

    const { start, end } = this.getQuarterDateRange(query.year, query.quarter);

    const transactions = await this.getUserTransactionsInRange(
      userId,
      start,
      end,
    );

    const incomeTotal = this.sumAmounts(
      transactions.filter((t) => t.type === 'income'),
    );
    const deductibleExpensesTotal = this.sumAmounts(
      transactions.filter(
        (t) => t.type === 'expense' && Boolean(t.tax_deductible),
      ),
    );

    const netIncome = incomeTotal - deductibleExpensesTotal;

    const taxSettings = await this.getOrCreateDefaultTaxSettings(userId);

    const selfEmploymentTax = this.calculateSelfEmploymentTax(netIncome);

    const federalIncomeTax = this.calculateFederalIncomeTax(
      netIncome,
      taxSettings.filing_status ?? 'single',
    );

    const totalEstimatedTax = selfEmploymentTax + federalIncomeTax;

    const quarterlyPaymentAmount = totalEstimatedTax / 4;

    const breakdown: TaxBreakdown = {
      year: query.year,
      quarter: query.quarter,
      incomeTotal,
      deductibleExpensesTotal,
      netIncome,
      selfEmploymentTax,
      federalIncomeTax,
      totalEstimatedTax,
      quarterlyPaymentAmount,
      dueDate: this.getQuarterlyDueDate(query.year, query.quarter),
    };

    await this.cache.setex(cacheKeyStr, 300, JSON.stringify(breakdown));

    return breakdown;
  }

  async calculateYearSummary(
    userId: string,
    year: number,
  ): Promise<YearSummary> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const cacheKeyStr = cacheKey('tax:summary', userId, String(year));
    const cached = await this.cache.get<string | null>(cacheKeyStr);

    if (cached) {
      try {
        const parsed: YearSummary = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('tax.summary.cache.parse_failed', { cacheKey: cacheKeyStr });
      }
    }

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const transactions = await this.getUserTransactionsInRange(
      userId,
      start,
      end,
    );

    const incomeTotal = this.sumAmounts(
      transactions.filter((t) => t.type === 'income'),
    );
    const deductibleExpensesTotal = this.sumAmounts(
      transactions.filter(
        (t) => t.type === 'expense' && Boolean(t.tax_deductible),
      ),
    );

    const netIncome = incomeTotal - deductibleExpensesTotal;

    const taxSettings = await this.getOrCreateDefaultTaxSettings(userId);

    const selfEmploymentTax = this.calculateSelfEmploymentTax(netIncome);

    const federalIncomeTax = this.calculateFederalIncomeTax(
      netIncome,
      taxSettings.filing_status ?? 'single',
    );

    const totalEstimatedTax = selfEmploymentTax + federalIncomeTax;

    const byCategory: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.tax_deductible) {
        const key = tx.category ?? 'uncategorized';
        byCategory[key] = (byCategory[key] ?? 0) + Number(tx.amount);
      }
    }

    const summary: YearSummary = {
      year,
      incomeTotal,
      deductibleExpensesTotal,
      netIncome,
      selfEmploymentTax,
      federalIncomeTax,
      totalEstimatedTax,
      byCategory,
    };

    await this.cache.setex(cacheKeyStr, 300, JSON.stringify(summary));

    return summary;
  }

  async getTaxSettings(userId: string): Promise<TaxSettingsRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const { data, error } = await this.supabase
      .from('tax_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('tax.settings.load_failed', error, { userId });
      throw new AppError(500, 'Failed to load tax settings');
    }

    if (!data) {
      throw new NotFoundError('Tax settings');
    }

    return data;
  }

  async updateTaxSettings(
    userId: string,
    rawData: unknown,
  ): Promise<TaxSettingsRow> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const parsed = taxSettingsSchema.parse(rawData) as TaxSettingsData;

    const upsertPayload = {
      user_id: userId,
      filing_status: parsed.filing_status,
      state: parsed.state,
      additional_states: parsed.additional_states,
      standard_deduction: parsed.standard_deduction ?? null,
      estimated_other_deductions: parsed.estimated_other_deductions ?? 0,
      quarterly_estimated_tax: parsed.quarterly_estimated_tax ?? null,
      send_quarterly_reminders: parsed.send_quarterly_reminders,
    };

    const { data, error } = await this.supabase
      .from('tax_settings')
      .upsert(upsertPayload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error || !data) {
      logger.error('tax.settings.update_failed', error, { userId });
      throw new AppError(500, 'Failed to update tax settings');
    }

    await this.invalidateTaxCache(userId);

    return data;
  }

  private async getUserTransactionsInRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<TransactionRow[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', start)
      .lte('date', end);

    if (error) {
      logger.error('tax.transactions.load_failed', error, {
        userId,
        start,
        end,
      });
      throw new AppError(500, 'Failed to load transactions for tax');
    }

    return data ?? [];
  }

  private sumAmounts(transactions: TransactionRow[]): number {
    return transactions.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );
  }

  private async getOrCreateDefaultTaxSettings(
    userId: string,
  ): Promise<TaxSettingsRow> {
    const { data, error } = await this.supabase
      .from('tax_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('tax.settings.load_or_create_failed', error, { userId });
      throw new AppError(500, 'Failed to load tax settings');
    }

    if (data) {
      return data;
    }

    const { data: created, error: insertError } = await this.supabase
      .from('tax_settings')
      .insert({
        user_id: userId,
        filing_status: 'single',
        state: 'CA',
        additional_states: [],
        standard_deduction: null,
        estimated_other_deductions: 0,
        quarterly_estimated_tax: null,
        send_quarterly_reminders: true,
      })
      .select('*')
      .single();

    if (insertError || !created) {
      logger.error('tax.settings.create_default_failed', insertError, {
        userId,
      });
      throw new AppError(500, 'Failed to create default tax settings');
    }

    return created;
  }

  private calculateSelfEmploymentTax(netIncome: number): number {
    if (netIncome <= 0) {
      return 0;
    }

    const seTaxableIncome = netIncome * SE_DEDUCTION_RATE;
    return seTaxableIncome * SELF_EMPLOYMENT_TAX_RATE;
  }

  private calculateFederalIncomeTax(
    netIncome: number,
    filingStatus: keyof typeof TAX_BRACKETS_2026,
  ): number {
    if (netIncome <= 0) {
      return 0;
    }

    const brackets = TAX_BRACKETS_2026[filingStatus] ?? TAX_BRACKETS_2026.single;

    let remaining = netIncome;
    let previousMax = 0;
    let tax = 0;

    for (const bracket of brackets) {
      const bracketMax = bracket.max;
      const taxableInBracket =
        bracketMax === Infinity
          ? remaining
          : Math.max(Math.min(remaining, bracketMax - previousMax), 0);

      if (taxableInBracket <= 0) {
        break;
      }

      tax += taxableInBracket * bracket.rate;
      remaining -= taxableInBracket;
      previousMax = bracketMax;

      if (remaining <= 0) {
        break;
      }
    }

    return tax;
  }

  private getQuarterDateRange(
    year: number,
    quarter: number,
  ): { start: string; end: string } {
    switch (quarter) {
      case 1:
        return {
          start: `${year}-01-01`,
          end: `${year}-03-31`,
        };
      case 2:
        return {
          start: `${year}-04-01`,
          end: `${year}-06-30`,
        };
      case 3:
        return {
          start: `${year}-07-01`,
          end: `${year}-09-30`,
        };
      case 4:
        return {
          start: `${year}-10-01`,
          end: `${year}-12-31`,
        };
      default:
        throw new AppError(400, 'Quarter must be between 1 and 4');
    }
  }

  private getQuarterlyDueDate(year: number, quarter: number): string {
    // Using standard IRS estimated tax due dates; year is used directly.
    switch (quarter) {
      case 1:
        return `${year}-04-15`;
      case 2:
        return `${year}-06-15`;
      case 3:
        return `${year}-09-15`;
      case 4:
        // Q4 payment is due Jan 15 of the following year.
        return `${year + 1}-01-15`;
      default:
        throw new AppError(400, 'Quarter must be between 1 and 4');
    }
  }

  private async invalidateTaxCache(userId: string): Promise<void> {
    const estimatePattern = cacheKey('tax:estimate', userId, '*');
    const summaryPattern = cacheKey('tax:summary', userId, '*');

    const estimateKeys = await this.cache.keys(estimatePattern);
    const summaryKeys = await this.cache.keys(summaryPattern);

    const keys = [...estimateKeys, ...summaryKeys];
    if (keys.length > 0) {
      await this.cache.del(...keys);
    }
  }
}



// feat: create transactions ledger with filters and categories
// 2026-01-11T17:28:00

// feat: implement light and dark theme toggle
// 2026-02-10T12:03:00

// feat: store encrypted tax IDs and OAuth tokens
// 2026-03-13T17:38:00

// feat: document software requirements and schema
// 2026-04-13T12:13:00

// feat: track payment date on paid invoices
// 2026-05-13T17:48:00

// feat: document API contracts in requirements spec
// 2026-06-13T12:23:00

// feat: show tax estimate history by quarter
// 2026-07-14T17:58:00

// feat: allow manual match of Stripe charge to deal
// 2026-08-13T12:33:00

// feat: add analytics date range selector
// 2026-09-13T17:08:00
