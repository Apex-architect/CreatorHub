import { NextRequest, NextResponse } from 'next/server';

import { TaxService } from '../../../../lib/services/tax.service';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

const taxService = new TaxService(supabase, redis);
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

    const query = {
      year: searchParams.get('year'),
      quarter: searchParams.get('quarter'),
    };

    const breakdown = await taxService.calculateQuarterlyEstimate(
      user.id,
      query,
    );

    return NextResponse.json(breakdown);
  } catch (error) {
    return handleError(error);
  }
}



// feat: implement edge rate limiting with Upstash Redis
// 2026-01-05T12:33:00

// feat: import charges without creating duplicates
// 2026-02-04T17:08:00

// feat: group expenses for breakdown charts
// 2026-03-07T12:43:00

// feat: add empty states for all dashboard modules
// 2026-04-07T17:18:00

// feat: hide real Stripe actions in demo mode
// 2026-05-07T12:53:00

// feat: return 429 with retry guidance when limited
// 2026-06-07T17:28:00

// feat: create consistent toast notification system
// 2026-07-08T12:03:00

// feat: return clear validation error messages
// 2026-08-07T17:38:00

// feat: support keyboard move between deal stages
// 2026-09-07T12:13:00
