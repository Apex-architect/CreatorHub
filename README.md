<div align="center">

# Creator Business Hub

**The business back-office for content creators: income, brand deals, invoices and taxes in one dashboard.**

Built by **Code-X-Builder**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Connect-635BFF?logo=stripe&logoColor=white)
![Jest](https://img.shields.io/badge/Tested_with-Jest-C21325?logo=jest&logoColor=white)

</div>

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API reference](#api-reference)
- [Testing](#testing)
- [Security](#security)
- [Project status](#project-status)
- [Documentation](#documentation)
- [Team](#team)

---

## Overview

Creators earn money from sponsorships, platform payouts, affiliate links and product sales, and they usually track it in spreadsheets. **Creator Business Hub** brings that work into one place:

- Record every transaction, sync payments from Stripe automatically, and categorize expenses.
- Track brand deals from pitch to payment on a pipeline board.
- Create professional invoices and export them as PDFs.
- See quarterly estimated taxes (self-employment and federal) as they build up during the year.
- Watch revenue trends and expense breakdowns on the analytics dashboard.

## Features

| Module | What it does |
| --- | --- |
| **Transactions** | Income and expense ledger with filters, categories, a create/edit modal and loading skeletons. |
| **Brand deals** | Pipeline board with deal cards and a detail drawer for sponsorships and partnerships. |
| **Invoices** | Invoice builder with live preview. Totals are recomputed on the server, and invoices export to PDF with `jsPDF`. |
| **Tax center** | Quarterly estimates using progressive federal brackets plus self-employment tax, a breakdown view and per-user tax settings (filing status and so on). Results are cached in Redis. |
| **Analytics** | KPI cards, a revenue trend chart and an expense breakdown. |
| **Stripe integration** | Stripe Connect OAuth onboarding and a signed webhook that imports charges idempotently, so replayed events never create duplicates. |
| **Onboarding & profile** | Onboarding flow and a `users/me` profile endpoint backed by Auth0 identities. |
| **UX** | Responsive sidebar and mobile nav, light/dark theme toggle, keyboard shortcuts and a demo-mode banner. |

**Feature flags** are driven by environment variables in [`lib/config/feature-flags.ts`](lib/config/feature-flags.ts):

| Flag | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | Shows the demo banner and runs in demo mode. |
| `NEXT_PUBLIC_ENABLE_YOUTUBE` | Turns on the YouTube integration (planned). |
| `NEXT_PUBLIC_ENABLE_PLAID` | Turns on the Plaid bank sync (planned). |

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Styling | Tailwind CSS, `class-variance-authority`, `tailwind-merge`, Framer Motion |
| Client state | Zustand, TanStack Query |
| Validation | Zod |
| Auth | Auth0 (`@auth0/nextjs-auth0`) |
| Database | PostgreSQL on Supabase (`@supabase/supabase-js`) |
| Cache & rate limiting | Upstash Redis, `@upstash/ratelimit` |
| Payments | Stripe (Connect and webhooks) |
| PDFs | jsPDF |
| Testing | Jest, ts-jest, jest-fetch-mock |
| Hosting | Vercel (serverless) and Supabase |

## Architecture

The app is a **modular monolith** that uses a service-layer pattern:

```
Browser ──► Edge middleware (Auth0 session check + 100 req/min per-IP rate limit)
              │
              ▼
        app/api/**/route.ts        ← thin HTTP handlers: auth, Zod validation, error mapping
              │
              ▼
        lib/services/*.service.ts  ← all business logic (tax math, invoicing, Stripe sync…)
              │
      ┌───────┴────────┐
      ▼                ▼
  Supabase         Upstash Redis
  (Postgres)       (cache)
```

- **Route handlers stay thin.** They authenticate, validate and delegate to a service.
- **Services own the business rules.** For example, invoice totals are always recomputed on the server and client-supplied totals are ignored.
- **The middleware** ([`middleware.ts`](middleware.ts)) protects `/dashboard/*` and every `/api/*` route except `auth` and `health`, and applies a sliding-window rate limit.
- **Branding** (app name, logos, colors) lives in one place: [`lib/config/branding.ts`](lib/config/branding.ts).

## Project structure

```
.
├── app/
│   ├── (dashboard)/            # Authenticated dashboard pages (route group)
│   │   ├── layout.tsx
│   │   ├── analytics/page.tsx
│   │   ├── tax/page.tsx
│   │   └── transactions/page.tsx
│   ├── api/                    # REST API (Next.js route handlers)
│   │   ├── analytics/          #   overview · revenue-trend · expense-breakdown
│   │   ├── deals/              #   CRUD
│   │   ├── integrations/stripe/#   connect · webhook
│   │   ├── invoices/           #   CRUD + [id]/pdf
│   │   ├── tax/                #   estimate · summary · settings
│   │   ├── transactions/       #   CRUD
│   │   └── users/              #   me · onboarding
│   └── globals.css
├── components/                 # UI components, grouped by feature
│   ├── analytics/  deals/  invoices/  layout/
│   ├── shared/     tax/    transactions/
├── lib/
│   ├── config/                 # Branding and feature flags
│   ├── hooks/                  # Reusable React hooks
│   ├── services/               # Business logic (service layer)
│   ├── store/                  # Zustand stores
│   └── utils/                  # API client, AES-256-GCM crypto helpers
├── __tests__/
│   ├── api/                    # Route handler tests
│   └── services/               # Service unit tests
├── docs/                       # Requirements and test documentation
├── middleware.ts               # Auth + rate limiting at the edge
├── .env.local.example          # Environment variable template
└── jest.config.cjs · next.config.js · tailwind.config.ts · tsconfig.json
```

The `@/*` path alias maps to the project root in both TypeScript and Jest.

## Getting started

### Prerequisites

- **Node.js ≥ 18** and **npm ≥ 9**
- Accounts or projects on **Auth0**, **Supabase**, **Upstash Redis** and **Stripe** (test mode is fine)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd Content-creators-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# …then fill in the values (see below)

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

### Database

The full PostgreSQL schema (users, transactions, deals, invoices, tax settings and so on) is in the **Database Schema** section of [`docs/software-requirements-specification.txt`](docs/software-requirements-specification.txt). Run those `CREATE TABLE` statements in the Supabase SQL editor before you start the app.

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/integrations/stripe/webhook
```

Copy the signing secret that the Stripe CLI prints into `STRIPE_WEBHOOK_SECRET`.

## Environment variables

All variables are listed in [`.env.local.example`](.env.local.example).

| Variable | Required | Description |
| --- | :---: | --- |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL of the app |
| `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | ✅ | Auth0 application credentials |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase project connection |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ✅ | Redis for caching and rate limiting |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CLIENT_ID` | ✅ | Stripe API, webhook verification and Connect OAuth |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Client-side Stripe key |
| `ENCRYPTION_KEY` | ✅ | Base64 32-byte key for AES-256-GCM (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_ENABLE_YOUTUBE`, `NEXT_PUBLIC_ENABLE_PLAID` | — | Feature flags (`true` / `false`) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET` | — | Monitoring and logging |

> ⚠️ Never commit `.env.local`. The `.gitignore` already excludes every `.env*` file except the example.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint (Next.js config) |
| `npm test` | Run the Jest test suite with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests and generate a coverage report |

## API reference

All endpoints require an authenticated Auth0 session except the Stripe webhook, which is verified by its signature.

| Endpoint | Methods | Description |
| --- | --- | --- |
| `/api/users/me` | `GET` `PATCH` | Current user profile |
| `/api/users/onboarding` | `POST` | Complete onboarding |
| `/api/transactions` | `GET` `POST` | List or create transactions |
| `/api/transactions/:id` | `GET` `PATCH` `DELETE` | Manage a single transaction |
| `/api/deals` | `GET` `POST` | List or create brand deals |
| `/api/deals/:id` | `GET` `PATCH` `DELETE` | Manage a single deal |
| `/api/invoices` | `GET` `POST` | List or create invoices |
| `/api/invoices/:id` | `GET` `PATCH` | Manage a single invoice |
| `/api/invoices/:id/pdf` | `GET` | Download an invoice as a PDF |
| `/api/tax/estimate` | `GET` | Quarterly estimate (`?year=2026&quarter=1`) |
| `/api/tax/summary` | `GET` | Tax summary |
| `/api/tax/settings` | `GET` `PUT` | Read or update tax settings |
| `/api/analytics/overview` | `GET` | KPI overview |
| `/api/analytics/revenue-trend` | `GET` | Revenue over time |
| `/api/analytics/expense-breakdown` | `GET` | Expenses by category |
| `/api/integrations/stripe/connect` | `POST` | Start Stripe Connect OAuth |
| `/api/integrations/stripe/webhook` | `POST` | Stripe event receiver (signature-verified) |

## Testing

```bash
npm test
```

Jest runs every `*.test.ts` file under `__tests__/` and enforces an **80% global coverage threshold** (branches, functions, lines and statements) on `lib/services/**` and `app/api/**`.

| Suite | What it covers |
| --- | --- |
| `services/tax.service.test.ts` | Quarterly estimate math, progressive brackets, Redis caching |
| `services/invoice.service.test.ts` | Server-side recalculation of subtotal, tax and total |
| `services/payment.service.stripe.test.ts` | Stripe events without a user are ignored; idempotent charge import |
| `api/tax.estimate.route.test.ts` | `GET /api/tax/estimate` returns a 200 with the estimate |
| `api/stripe.webhook.route.test.ts` | Unsigned requests get a 400; correctly signed events are processed |

[`docs/test-documentation.docx`](docs/test-documentation.docx) describes each test in more detail.

## Security

- **Authentication:** Auth0 sessions are enforced at the edge by the middleware and checked again in each route handler.
- **Rate limiting:** a sliding window of 100 requests per minute per IP, backed by Upstash.
- **Encryption at rest:** sensitive fields such as tax IDs and OAuth tokens are encrypted with AES-256-GCM ([`lib/utils/crypto.ts`](lib/utils/crypto.ts)) before they are written to the database.
- **Webhook integrity:** Stripe webhooks are rejected unless the signature is valid.
- **Server-authoritative math:** invoice and tax totals are always calculated on the server.

## Project status

🚧 **MVP in progress.** The service layer, the API routes, several dashboard pages and the core UI components are in place. Remaining work:

- **Modules that are imported but not yet added:**
  - `lib/db/`: the `supabase` and `redis` clients
  - `lib/schemas/`: the `user`, `transaction`, `deal`, `invoice` and `tax` Zod schemas
  - `lib/types/database.types`
  - `lib/utils/`: `errors`, `error-handler`, `auth`, `logger` and `cache`
  - `lib/config/`: `categories` and `tax-brackets`

  The app will not build until these exist. The requirements spec defines them.
- **Missing pages and root files:** the root `app/layout.tsx` and the landing page, plus the Overview, Deals, Invoices and Settings dashboard pages.
- **Route mismatch:** the dashboard pages live in the `(dashboard)` route group, so they are served at `/analytics`, `/tax` and so on. The sidebar and middleware expect `/dashboard/...`, so one side needs to change (for example, rename the folder to `app/dashboard/`).
- **Planned integrations:** YouTube and Plaid, both behind feature flags.

## Documentation

| Document | Description |
| --- | --- |
| [`docs/software-requirements-specification.txt`](docs/software-requirements-specification.txt) | Full SRS: tech stack, database schema, feature modules, API contracts, non-functional requirements |
| [`docs/test-documentation.docx`](docs/test-documentation.docx) | Test plan and coverage overview |

## Team

Designed and developed by **Code-X-Builder**.

---

<div align="center">
<sub>© Code-X-Builder. All rights reserved.</sub>
</div>

// feat: implement revenue trend chart data endpoint
// 2026-01-30T13:24:00

// feat: persist per-user tax settings in Postgres
// 2026-03-02T18:59:00

// feat: support state tax rate override in settings
// 2026-04-02T13:34:00

// feat: polish Framer Motion page transitions
// 2026-05-02T18:09:00

// feat: surface sync status for Stripe connection
// 2026-06-02T13:44:00

// feat: ensure keyboard focus order on modals
// 2026-07-03T18:19:00

// feat: ensure dark mode contrast on all cards
// 2026-08-02T13:54:00

// chore: mark 2026 creator business hub milestone
// 2026-09-02T18:29:00
