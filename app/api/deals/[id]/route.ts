import { NextRequest, NextResponse } from 'next/server';

import { DealService } from '../../../../lib/services/deal.service';
import { PaymentService } from '../../../../lib/services/payment.service';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

const paymentService = new PaymentService(supabase, redis);
const dealService = new DealService(supabase, paymentService);
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const result = await dealService.getDealById(user.id, params.id);

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();
    const updated = await dealService.updateDeal(user.id, params.id, body);

    return NextResponse.json(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    await dealService.deleteDeal(user.id, params.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}


