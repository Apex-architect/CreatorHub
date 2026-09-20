import { NextRequest, NextResponse } from 'next/server';

import { PaymentService } from '../../../../lib/services/payment.service';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const transaction = await paymentService.getTransactionById(
      user.id,
      params.id,
    );

    return NextResponse.json(transaction);
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
    const updated = await paymentService.updateTransaction(
      user.id,
      params.id,
      body,
    );

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

    await paymentService.deleteTransaction(user.id, params.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}


