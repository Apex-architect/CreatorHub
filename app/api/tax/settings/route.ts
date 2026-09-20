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

    const settings = await taxService.getTaxSettings(user.id);

    return NextResponse.json(settings);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();

    const updated = await taxService.updateTaxSettings(user.id, body);

    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}



// feat: create Supabase client and database connection helpers
// 2026-01-06T13:44:00

// feat: encrypt sensitive fields with AES-256-GCM
// 2026-02-05T18:19:00

// feat: start Stripe Connect account linking
// 2026-03-08T13:54:00

// feat: implement optimistic updates on deal moves
// 2026-04-08T18:29:00

// feat: improve PDF layout and typography
// 2026-05-08T13:04:00

// feat: harden CORS and security headers
// 2026-06-08T18:39:00

// feat: support bulk categorize for transactions
// 2026-07-09T13:14:00

// feat: log failed Stripe events for inspection
// 2026-08-09T18:49:00

// feat: add invoice preview print stylesheet
// 2026-09-08T13:24:00
