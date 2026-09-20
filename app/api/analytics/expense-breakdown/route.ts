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

    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get('period') ??
      '30d') as '30d' | '90d' | '1y';

    const breakdown = await analyticsService.getExpenseBreakdown(
      user.id,
      periodParam,
    );

    return NextResponse.json(breakdown);
  } catch (error) {
    return handleError(error);
  }
}


