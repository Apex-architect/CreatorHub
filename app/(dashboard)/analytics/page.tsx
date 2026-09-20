'use client';

import { Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from '../../../lib/utils/api';
import { KPICard } from '../../../components/analytics/KPICard';
import { RevenueChart, type RevenuePoint } from '../../../components/analytics/RevenueChart';
import { TransactionListSkeleton } from '../../../components/transactions/TransactionListSkeleton';

type Period = '30d' | '90d' | '1y';

interface OverviewResponse {
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

interface RevenueTrendResponse {
  period: Period;
  grouping: 'day' | 'week' | 'month';
  points: RevenuePoint[];
}

function AnalyticsContent() {
  const [period, setPeriod] = useState<Period>('30d');

  const overviewQuery = useQuery<OverviewResponse, ApiError>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<OverviewResponse>('/api/analytics/overview'),
  });

  const trendQuery = useQuery<RevenueTrendResponse, ApiError>({
    queryKey: ['analytics', 'revenue-trend', period],
    queryFn: () =>
      api.get<RevenueTrendResponse>(
        `/api/analytics/revenue-trend?period=${period}`,
      ),
  });

  const isLoading = overviewQuery.isLoading || trendQuery.isLoading;

  const current = overviewQuery.data?.currentMonthRevenue ?? 0;
  const last = overviewQuery.data?.lastMonthRevenue ?? 0;
  const diff = current - last;

  const revenueTrendDirection =
    diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  const revenueTrendLabel =
    last > 0
      ? `${diff > 0 ? '+' : ''}${Math.round(
          (diff / last) * 100,
        )}% vs last month`
      : undefined;

  const expenses = overviewQuery.data?.currentMonthExpenses ?? 0;
  const deals = overviewQuery.data?.activeDealsCount ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
      <header className="mb-1 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Analytics
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          High-level insight into your revenue, spend, and deal activity.
        </p>
      </header>

      {overviewQuery.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
          {overviewQuery.error.message}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <KPICard
          label="This month revenue"
          value={current}
          prefix="$"
          trendDirection={revenueTrendDirection}
          trendLabel={revenueTrendLabel}
          description="Gross income recorded this month."
        />
        <KPICard
          label="This month expenses"
          value={expenses}
          prefix="$"
          description="Total outgoing spend recorded this month."
        />
        <KPICard
          label="Active deals"
          value={deals}
          suffix=""
          description="Deals in lead, negotiating, contracted, or delivered."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <RevenueChart
          data={trendQuery.data?.points ?? []}
          period={period}
          isLoading={trendQuery.isLoading}
          onPeriodChange={setPeriod}
        />

        <aside className="space-y-3">
          <section className="card glass-surface p-3 sm:p-4">
            <h2 className="mb-1 text-sm font-semibold sm:text-base">
              Quick insight
            </h2>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              {current > last
                ? 'Revenue is trending up compared to last month. Consider leaning into top-performing channels.'
                : current < last
                ? 'Revenue is down versus last month. Review underperforming categories and active deals.'
                : 'Revenue is flat versus last month. Look for opportunities to diversify income sources.'}
            </p>
          </section>

          <section className="card p-3 sm:p-4">
            <h2 className="mb-1 text-sm font-semibold sm:text-base">
              Audience snapshot
            </h2>
            {overviewQuery.data ? (
              <dl className="grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
                <div>
                  <dt className="text-muted-foreground">YouTube subs</dt>
                  <dd className="font-semibold">
                    {overviewQuery.data.youtube.subscribers.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">YouTube views</dt>
                  <dd className="font-semibold">
                    {overviewQuery.data.youtube.views.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Instagram followers</dt>
                  <dd className="font-semibold">
                    {overviewQuery.data.instagram.followers.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Instagram reach</dt>
                  <dd className="font-semibold">
                    {overviewQuery.data.instagram.reach.toLocaleString()}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Connect your channels to see real audience metrics.
              </p>
            )}
          </section>
        </aside>
      </section>

      {isLoading && (
        <div className="sr-only" aria-live="polite">
          Loading analytics…
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<TransactionListSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}


