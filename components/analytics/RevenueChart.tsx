'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Period = '30d' | '90d' | '1y';

export interface RevenuePoint {
  date: string;
  amount: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  period: Period;
  isLoading: boolean;
  onPeriodChange: (period: Period) => void;
}

export function RevenueChart({
  data,
  period,
  isLoading,
  onPeriodChange,
}: RevenueChartProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => data ?? [], [data]);

  const max = points.reduce(
    (acc, point) => Math.max(acc, point.amount),
    0,
  );

  const viewBoxWidth = 1000;
  const viewBoxHeight = 260;

  const pathD = useMemo(() => {
    if (!points.length || max === 0) return '';

    const stepX =
      points.length === 1
        ? viewBoxWidth / 2
        : viewBoxWidth / (points.length - 1);

    const coords = points.map((point, index) => {
      const x = index * stepX;
      const normalized = point.amount / max;
      const y = viewBoxHeight - normalized * (viewBoxHeight - 40) - 20;
      return { x, y };
    });

    let d = `M ${coords[0]?.x} ${coords[0]?.y}`;
    for (let i = 1; i < coords.length; i += 1) {
      const current = coords[i];
      const prev = coords[i - 1];
      const midX = (prev.x + current.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${current.y}, ${current.x} ${current.y}`;
    }
    return d;
  }, [points, max]);

  const activePoint =
    hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  return (
    <section className="card flex flex-col gap-3 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold sm:text-base">
            Revenue trend
          </h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Track how your income evolves over time.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-muted p-0.5 text-[11px] sm:text-xs">
          {(['30d', '90d', '1y'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodChange(p)}
              className={`rounded-full px-2 py-0.5 font-medium ${
                period === p
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="relative mt-1 h-64 w-full">
        {isLoading || !points.length ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {isLoading ? 'Loading chart…' : 'No revenue data in this period.'}
          </div>
        ) : (
          <div className="relative h-full w-full">
            <motion.svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="revenue-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              <motion.path
                d={pathD}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                initial={
                  prefersReducedMotion
                    ? undefined
                    : { pathLength: 0 }
                }
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { pathLength: 1 }
                }
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <motion.path
                d={`${pathD} L ${viewBoxWidth} ${viewBoxHeight} L 0 ${viewBoxHeight} Z`}
                fill="url(#revenue-fill)"
                initial={
                  prefersReducedMotion
                    ? undefined
                    : { opacity: 0 }
                }
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { opacity: 1 }
                }
                transition={{ duration: 0.4 }}
              />

              {points.map((point, index) => {
                const stepX =
                  points.length === 1
                    ? viewBoxWidth / 2
                    : viewBoxWidth / (points.length - 1);
                const x = index * stepX;
                const normalized = max > 0 ? point.amount / max : 0;
                const y =
                  viewBoxHeight - normalized * (viewBoxHeight - 40) - 20;

                return (
                  <g key={point.date}>
                    <circle
                      cx={x}
                      cy={y}
                      r={hoverIndex === index ? 4 : 3}
                      fill="hsl(var(--primary))"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoverIndex(index)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                    <rect
                      x={x - 10}
                      y={0}
                      width={20}
                      height={viewBoxHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoverIndex(index)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  </g>
                );
              })}
            </motion.svg>

            {activePoint ? (
              <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-[11px] text-muted-foreground shadow-soft sm:text-xs">
                  <span className="font-medium text-foreground">
                    {activePoint.amount.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span>on {activePoint.date}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}



// feat: cache tax estimates in Redis
// 2026-01-25T09:40:00

// feat: add invoice line items and tax rate handling
// 2026-02-25T14:15:00

// feat: allow invoice send and mark-as-paid actions
// 2026-03-28T09:50:00

// feat: secure ENCRYPTION_KEY handling
// 2026-04-27T14:25:00

// feat: support sponsorship platform and product income types
// 2026-05-28T09:00:00

// feat: add categories and tax-brackets config
// 2026-06-28T14:35:00

// feat: localize date formats for dashboards
// 2026-07-28T09:10:00

// feat: prioritize remaining build blockers
// 2026-08-28T14:45:00

// feat: require tests before merge in docs
// 2026-09-28T09:20:00
