'use client';

import { isDemoMode } from '../../lib/config/feature-flags';

export function DemoBanner() {
  if (!isDemoMode()) {
    return null;
  }

  return (
    <div className="mb-2 rounded-md border border-amber-400/70 bg-amber-50/80 px-3 py-1.5 text-[11px] text-amber-900 shadow-soft sm:text-xs dark:border-amber-300/60 dark:bg-amber-900/20 dark:text-amber-100">
      You are viewing demo data. Numbers and entities are for illustration
      only.
    </div>
  );
}


