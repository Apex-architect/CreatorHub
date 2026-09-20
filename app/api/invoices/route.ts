import { NextRequest, NextResponse } from 'next/server';

import { InvoiceService } from '../../../lib/services/invoice.service';
import { PaymentService } from '../../../lib/services/payment.service';
import { UserService } from '../../../lib/services/user.service';
import { supabase } from '../../../lib/db/supabase';
import { redis } from '../../../lib/db/redis';
import { getSession } from '../../../lib/utils/auth';
import { handleError } from '../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const invoiceService = new InvoiceService(supabase, redis, paymentService);
const userService = new UserService(supabase, redis);

async function resolveOrCreateUserFromSession(req: NextRequest) {
  const session = await getSession(req);

  const auth0Id: string | undefined = session?.user?.sub;
  const email: string | undefined = session?.user?.email;

  if (!auth0Id || !email) {
    throw new UnauthorizedError('Missing Auth0 session');
  }

  const user = await userService.createUser(auth0Id, email);
  if (!user) {
    throw new AppError(500, 'Failed to resolve user from session');
  }

  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;

    const invoices = await invoiceService.getInvoices(user.id, status ?? undefined);

    return NextResponse.json(invoices);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();
    const invoice = await invoiceService.createInvoice(user.id, body);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}



// feat: add Auth0 session middleware and route protection
// 2026-01-03T11:22:00

// feat: handle signed Stripe webhooks idempotently
// 2026-02-03T16:57:00

// feat: build time-series revenue trend endpoint
// 2026-03-06T11:32:00

// feat: create expense category color mapping
// 2026-04-05T16:07:00

// feat: support demo seed data when demo mode is on
// 2026-05-06T11:42:00

// feat: add rate limit headers on API responses
// 2026-06-06T16:17:00

// feat: add loading and error states on all data pages
// 2026-07-06T11:52:00

// feat: harden Zod schemas against bad payloads
// 2026-08-06T16:27:00

// feat: improve deal card density on pipeline
// 2026-09-06T11:02:00
