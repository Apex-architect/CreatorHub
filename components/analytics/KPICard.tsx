'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

type TrendDirection = 'up' | 'down' | 'neutral';

interface KPICardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trendDirection?: TrendDirection;
  trendLabel?: string;
  description?: string;
}

export function KPICard({
  label,
  value,
  prefix,
  suffix,
  trendDirection = 'neutral',
  trendLabel,
  description,
}: KPICardProps) {
  const prefersReducedMotion = useReducedMotion();
  const raw = useMotionValue(0);
  const spring = useSpring(raw, {
    stiffness: 90,
    damping: 18,
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      raw.set(value);
      return;
    }
    raw.set(0);
    const timeout = setTimeout(() => {
      raw.set(value);
    }, 60);
    return () => clearTimeout(timeout);
  }, [value, prefersReducedMotion, raw]);

  const formatted = spring.get().toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

  const trendColor =
    trendDirection === 'up'
      ? 'text-emerald-500'
      : trendDirection === 'down'
      ? 'text-red-500'
      : 'text-muted-foreground';

  const trendIcon =
    trendDirection === 'up'
      ? '▲'
      : trendDirection === 'down'
      ? '▼'
      : '●';

  return (
    <section className="card flex flex-col justify-between gap-2 p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
          {label}
        </p>
      </header>
      <div className="flex items-baseline gap-2">
        <motion.span
          className="text-xl font-semibold tracking-tight sm:text-2xl"
          aria-live="polite"
        >
          {prefix ?? ''}
          {formatted}
          {suffix ?? ''}
        </motion.span>
        {trendLabel ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium ${trendColor}`}
          >
            <span aria-hidden>{trendIcon}</span>
            <span>{trendLabel}</span>
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="text-[11px] text-muted-foreground sm:text-xs">
          {description}
        </p>
      ) : null}
    </section>
  );
}


