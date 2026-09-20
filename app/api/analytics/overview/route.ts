import { NextRequest, NextResponse } from 'next/server';

import { AnalyticsService } from '../../../../lib/services/analytics.service';
import { PaymentService } from '../../../../lib/services/payment.service';
import { DealService } from '../../../../lib/services/deal.service';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const dealService = new DealService(supabase, paymentService);
const analyticsService = new AnalyticsService(
  supabase,
  redis,
  paymentService,
  dealService,
);
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

    const overview = await analyticsService.getDashboardOverview(user.id);

    return NextResponse.json(overview);
  } catch (error) {
    return handleError(error);
  }
}



// feat: define user profile and onboarding schema
// 2026-01-07T14:55:00

// feat: centralize branding in config module
// 2026-02-07T09:30:00

// feat: verify webhook signatures before processing
// 2026-03-09T14:05:00

// feat: add confirmation for destructive deletes
// 2026-04-09T09:40:00

// feat: include invoice number and due date on PDF
// 2026-05-10T14:15:00

// feat: validate all env vars at startup where possible
// 2026-06-09T09:50:00

// feat: add export CSV for transactions and deals
// 2026-07-10T14:25:00

// feat: ignore unhandled Stripe event types safely
// 2026-08-10T09:00:00

// feat: include payment instructions on PDF
// 2026-09-09T14:35:00
