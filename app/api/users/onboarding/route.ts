import { NextRequest, NextResponse } from 'next/server';

import { onboardingSchema } from '../../../../lib/schemas/user.schema';
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

/**
 * Shape minimal tax settings data for API responses.
 * Safest assumption: expose only non-sensitive configuration fields.
 */
function serializeTaxSettings(taxSettings: {
  id: string;
  user_id: string;
  filing_status: string | null;
  state: string | null;
  additional_states: string[] | null;
  standard_deduction: string | number | null;
  estimated_other_deductions: string | number | null;
  quarterly_estimated_tax: string | number | null;
  send_quarterly_reminders: boolean | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: taxSettings.id,
    userId: taxSettings.user_id,
    filingStatus: taxSettings.filing_status,
    state: taxSettings.state,
    additionalStates: taxSettings.additional_states ?? [],
    standardDeduction: taxSettings.standard_deduction,
    estimatedOtherDeductions: taxSettings.estimated_other_deductions,
    quarterlyEstimatedTax: taxSettings.quarterly_estimated_tax,
    sendQuarterlyReminders: taxSettings.send_quarterly_reminders,
    createdAt: taxSettings.created_at,
    updatedAt: taxSettings.updated_at,
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

export async function POST(req: NextRequest) {
  try {
    const user = await resolveOrCreateUserFromSession(req);

    const body = await req.json();
    const payload = onboardingSchema.parse(body);

    const result = await userService.completeOnboarding(user.id, payload);

    return NextResponse.json({
      user: serializeUser(result.user),
      taxSettings: serializeTaxSettings(result.taxSettings),
    });
  } catch (error) {
    return handleError(error);
  }
}


