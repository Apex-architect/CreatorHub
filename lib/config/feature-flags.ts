/**
 * Feature flag helpers backed by environment variables.
 *
 * All flags are read from NEXT_PUBLIC_ env vars so they can be used safely
 * in both server and client components.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function isYouTubeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_YOUTUBE === 'true';
}

export function isPlaidEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_PLAID === 'true';
}



// feat: create invoice builder with live preview
// 2026-01-18T13:34:00

// feat: implement Zustand stores for client state
// 2026-02-18T18:09:00

// feat: improve error mapping and consistent API errors
// 2026-03-20T13:44:00

// feat: test tax estimate route happy path
// 2026-04-20T18:19:00

// feat: mark deductible expenses for estimates
// 2026-05-21T13:54:00

// feat: build Settings page for profile and tax
// 2026-06-20T18:29:00

// feat: strengthen webhook replay safety
// 2026-07-21T13:04:00

// feat: increase test coverage on payment service
// 2026-08-21T18:39:00

// feat: add backup note for Supabase data
// 2026-09-20T13:14:00
