import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';

import type { Database } from '../types/database.types';
import { PaymentService } from './payment.service';
import { DealService } from './deal.service';
import { cacheKey } from '../utils/cache';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

type DbClient = SupabaseClient<Database>;

type TransactionRow = Database['public']['Tables']['transactions']['Row'];

type Period = '30d' | '90d' | '1y';
type Grouping = 'day' | 'week' | 'month';

interface DashboardOverview {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  currentMonthExpenses: number;
  activeDealsCount: number;
  youtube: {
    subscribers: number;
    views: number;
    videos: number;
    engagementRate: number;
    avgViewDurationSeconds: number;
  };
  instagram: {
    followers: number;
    posts: number;
    engagementRate: number;
    reach: number;
  };
}

interface RevenuePoint {
  date: string;
  amount: number;
}

interface RevenueTrend {
  period: Period;
  grouping: Grouping;
  points: RevenuePoint[];
}

interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdown {
  period: Period;
  total: number;
  categories: ExpenseCategoryBreakdown[];
}

export class AnalyticsService {
  private readonly supabase: DbClient;

  private readonly cache: Redis;

  private readonly paymentService: PaymentService;

  // Note: DealService is currently unused but kept for future extensions
  // such as deeper revenue analytics by deal stage.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly dealService: DealService;

  constructor(
    supabase: DbClient,
    cache: Redis,
    paymentService: PaymentService,
    dealService: DealService,
  ) {
    this.supabase = supabase;
    this.cache = cache;
    this.paymentService = paymentService;
    this.dealService = dealService;
  }

  async getDashboardOverview(userId: string): Promise<DashboardOverview> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const key = cacheKey('analytics:overview', userId);
    const cached = await this.cache.get<string | null>(key);

    if (cached) {
      try {
        const parsed: DashboardOverview = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('analytics.overview.cache.parse_failed', { key });
      }
    }

    const now = new Date();
    const { currentMonthStart, currentMonthEnd, lastMonthStart, lastMonthEnd } =
      this.getMonthRanges(now);

    const currentMonthTransactions = await this.getUserTransactionsInRange(
      userId,
      currentMonthStart,
      currentMonthEnd,
    );

    const lastMonthTransactions = await this.getUserTransactionsInRange(
      userId,
      lastMonthStart,
      lastMonthEnd,
    );

    const currentMonthRevenue = this.sumAmounts(
      currentMonthTransactions.filter((tx) => tx.type === 'income'),
    );

    const currentMonthExpenses = this.sumAmounts(
      currentMonthTransactions.filter((tx) => tx.type === 'expense'),
    );

    const lastMonthRevenue = this.sumAmounts(
      lastMonthTransactions.filter((tx) => tx.type === 'income'),
    );

    const activeDealsCount = await this.getActiveDealsCount(userId);

    const overview: DashboardOverview = {
      currentMonthRevenue,
      lastMonthRevenue,
      currentMonthExpenses,
      activeDealsCount,
      youtube: this.getYouTubeMetrics(),
      instagram: this.getInstagramMetrics(),
    };

    await this.cache.setex(key, 300, JSON.stringify(overview));

    return overview;
  }

  async getRevenueTrend(
    userId: string,
    period: Period,
  ): Promise<RevenueTrend> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const grouping = this.getGroupingForPeriod(period);
    const { start, end } = this.getDateRangeForPeriod(period);

    const key = cacheKey(
      'analytics:revenue',
      userId,
      period,
      grouping,
    );
    const cached = await this.cache.get<string | null>(key);

    if (cached) {
      try {
        const parsed: RevenueTrend = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('analytics.revenue.cache.parse_failed', { key });
      }
    }

    const transactions = await this.getUserTransactionsInRange(
      userId,
      start,
      end,
    );

    const incomeTransactions = transactions.filter(
      (tx) => tx.type === 'income',
    );

    const grouped = this.groupTransactionsByPeriod(
      incomeTransactions,
      grouping,
    );

    const points: RevenuePoint[] = Object.entries(grouped)
      .map(([date, amount]) => ({
        date,
        amount,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const trend: RevenueTrend = {
      period,
      grouping,
      points,
    };

    await this.cache.setex(key, 300, JSON.stringify(trend));

    return trend;
  }

  async getExpenseBreakdown(
    userId: string,
    period: Period,
  ): Promise<ExpenseBreakdown> {
    if (!userId) {
      throw new AppError(400, 'userId is required');
    }

    const { start, end } = this.getDateRangeForPeriod(period);

    const key = cacheKey('analytics:expenses', userId, period);
    const cached = await this.cache.get<string | null>(key);

    if (cached) {
      try {
        const parsed: ExpenseBreakdown = JSON.parse(cached);
        return parsed;
      } catch (error) {
        logger.warn('analytics.expenses.cache.parse_failed', { key });
      }
    }

    const transactions = await this.getUserTransactionsInRange(
      userId,
      start,
      end,
    );

    const expenseTransactions = transactions.filter(
      (tx) => tx.type === 'expense',
    );

    const totalsByCategory: Record<string, number> = {};

    for (const tx of expenseTransactions) {
      const category = tx.category ?? 'uncategorized';
      totalsByCategory[category] =
        (totalsByCategory[category] ?? 0) + Number(tx.amount);
    }

    const total = Object.values(totalsByCategory).reduce(
      (sum, value) => sum + value,
      0,
    );

    const categories: ExpenseCategoryBreakdown[] = Object.entries(
      totalsByCategory,
    )
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const breakdown: ExpenseBreakdown = {
      period,
      total,
      categories,
    };

    await this.cache.setex(key, 300, JSON.stringify(breakdown));

    return breakdown;
  }

  getYouTubeMetrics() {
    return {
      subscribers: 150_000,
      views: 2_500_000,
      videos: 120,
      engagementRate: 4.5,
      avgViewDurationSeconds: 480,
    };
  }

  getInstagramMetrics() {
    return {
      followers: 75_000,
      posts: 450,
      engagementRate: 3.2,
      reach: 250_000,
    };
  }

  private async getUserTransactionsInRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<TransactionRow[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('id, date, amount, type, category')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', start)
      .lte('date', end);

    if (error) {
      logger.error('analytics.transactions.load_failed', error, {
        userId,
        start,
        end,
      });
      throw new AppError(500, 'Failed to load transactions for analytics');
    }

    return data ?? [];
  }

  private async getActiveDealsCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('brand_deals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['lead', 'negotiating', 'contracted', 'delivered']);

    if (error) {
      logger.error('analytics.deals.count_failed', error, { userId });
      throw new AppError(500, 'Failed to load active deals count');
    }

    return count ?? 0;
  }

  private sumAmounts(transactions: TransactionRow[]): number {
    return transactions.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );
  }

  private getMonthRanges(now: Date) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const currentMonthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const currentMonthEnd = this.getMonthEndISO(year, month);

    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1;

    const lastMonthStart = `${lastYear}-${lastMonth
      .toString()
      .padStart(2, '0')}-01`;
    const lastMonthEnd = this.getMonthEndISO(lastYear, lastMonth);

    return {
      currentMonthStart,
      currentMonthEnd,
      lastMonthStart,
      lastMonthEnd,
    };
  }

  private getMonthEndISO(year: number, month: number): string {
    const end = new Date(year, month, 0);
    return `${end.getFullYear()}-${(end.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')}`;
  }

  private getDateRangeForPeriod(period: Period): { start: string; end: string } {
    const endDate = new Date();
    const startDate = new Date(endDate);

    if (period === '30d') {
      startDate.setDate(endDate.getDate() - 29);
    } else if (period === '90d') {
      startDate.setDate(endDate.getDate() - 89);
    } else {
      startDate.setFullYear(endDate.getFullYear() - 1);
    }

    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);

    return { start, end };
  }

  private getGroupingForPeriod(period: Period): Grouping {
    if (period === '30d') {
      return 'day';
    }
    if (period === '90d') {
      return 'week';
    }
    return 'month';
  }

  private groupTransactionsByPeriod(
    transactions: TransactionRow[],
    grouping: Grouping,
  ): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const tx of transactions) {
      const key = this.getGroupingKey(tx.date, grouping);
      groups[key] = (groups[key] ?? 0) + Number(tx.amount);
    }

    return groups;
  }

  private getGroupingKey(dateString: string, grouping: Grouping): string {
    const date = new Date(dateString);

    if (grouping === 'day') {
      return date.toISOString().slice(0, 10);
    }

    if (grouping === 'week') {
      const weekYear = date.getUTCFullYear();
      const weekNumber = this.getISOWeek(date);
      return `${weekYear}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private getISOWeek(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}


