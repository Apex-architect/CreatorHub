import { NextRequest, NextResponse } from 'next/server';

import { updateUserSchema } from '../../../../lib/schemas/user.schema';
import { UserService } from '../../../../lib/services/user.service';
import { supabase } from '../../../../lib/db/supabase';
import { redis } from '../../../../lib/db/redis';
import { getSession } from '../../../../lib/utils/auth';
import { handleError } from '../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../lib/utils/errors';

const userService = new UserService(supabase, redis);

/**
 * Shape user data for API responses.
 * Safest assumption: do not expose sensitive fields like tax_id.
 */
function serializeUser(user: {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  entity_type: string | null;
  primary_currency: string | null;
  timezone: string | null;
  country: string | null;
  state: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    businessName: user.business_name,
    entityType: user.entity_type,
    primaryCurrency: user.primary_currency,
    timezone: user.timezone,
    country: user.country,
    state: user.state,
    subscriptionTier: user.subscription_tier,
    subscriptionStatus: user.subscription_status,
    onboardingCompleted: user.onboarding_completed,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

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
    return NextResponse.json(serializeUser(user));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();
    const payload = updateUserSchema.parse(body);

    const updated = await userService.updateUser(user.id, payload);

    return NextResponse.json(serializeUser(updated));
  } catch (error) {
    return handleError(error);
  }
}



// feat: implement onboarding completion flow
// 2026-01-09T16:17:00

// feat: create responsive sidebar and mobile navigation
// 2026-02-09T11:52:00

// feat: ignore events without a linked user
// 2026-03-12T16:27:00

// feat: expose feature flag status to the client
// 2026-04-11T11:02:00

// feat: allow custom invoice notes and terms
// 2026-05-12T16:37:00

// feat: keep client totals ignored for invoices and tax
// 2026-06-12T11:12:00

// feat: allow recurring invoice templates scaffold
// 2026-07-13T16:47:00

// feat: attach metadata to imported transactions
// 2026-08-12T11:22:00

// feat: allow estimated vs actual tax comparison scaffold
// 2026-09-12T16:57:00
