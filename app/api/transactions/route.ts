import { NextRequest, NextResponse } from 'next/server';

import { PaymentService } from '../../../lib/services/payment.service';
import { UserService } from '../../../lib/services/user.service';
import { supabase } from '../../../lib/db/supabase';
import { redis } from '../../../lib/db/redis';
import { getSession } from '../../../lib/utils/auth';
import { handleError } from '../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const userService = new UserService(supabase, redis);

async function resolveOrCreateUserFromSession(req: NextRequest) {
  const session = await getSession(req);

  // Safest assumption based on Auth0 SDK:
  // - auth0 "sub" contains the unique identifier.
  // - "email" field is present on the user object.
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
    const filters = {
      type: searchParams.get('type') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      start_date: searchParams.get('start_date') ?? undefined,
      end_date: searchParams.get('end_date') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    };

    const result = await paymentService.getTransactions(user.id, filters);

    return NextResponse.json({
      data: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();

    // Note: Receipt upload to Supabase Storage is assumed to be handled
    // client-side for MVP, with this endpoint persisting the resulting URL
    // via the "receipt_url" field.
    const transaction = await paymentService.createTransaction(user.id, body);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}



// feat: bootstrap Next.js 14 App Router with TypeScript strict mode
// 2026-01-01T09:00:00

// feat: add expense breakdown by category
// 2026-02-01T14:35:00

// feat: invalidate Redis cache on settings change
// 2026-03-03T09:10:00

// feat: cache analytics overview for short TTL
// 2026-04-03T14:45:00

// feat: ensure mobile nav closes after navigation
// 2026-05-04T09:20:00

// feat: allow disconnect of Stripe Connect account
// 2026-06-03T14:55:00

// feat: optimize bundle with dynamic imports
// 2026-07-04T09:30:00

// feat: add subtle motion to pipeline card moves
// 2026-08-04T14:05:00

// feat: refine transaction filters and date presets
// 2026-09-03T09:40:00
