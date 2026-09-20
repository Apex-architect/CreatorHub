import { NextRequest, NextResponse } from 'next/server';

import { UserService } from '../../../../../lib/services/user.service';
import { supabase } from '../../../../../lib/db/supabase';
import { redis } from '../../../../../lib/db/redis';
import { getSession } from '../../../../../lib/utils/auth';
import { handleError } from '../../../../../lib/utils/error-handler';
import { AppError, UnauthorizedError } from '../../../../../lib/utils/errors';

const userService = new UserService(supabase, redis);

/**
 * Initiate Stripe Connect OAuth by returning a redirect URL.
 *
 * Safest assumptions (documented):
 * - The actual OAuth callback and account linkage will be handled in a
 *   dedicated callback route in a later module.
 * - For Week 3 we only need to provide a correctly parameterised URL that
 *   the frontend can redirect the user to.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);

    const auth0Id: string | undefined = session?.user?.sub;
    const email: string | undefined = session?.user?.email;

    if (!auth0Id || !email) {
      throw new UnauthorizedError('Missing Auth0 session');
    }

    // Ensure the user exists (creates user if needed).
    const user = await userService.createUser(auth0Id, email);
    if (!user) {
      throw new AppError(500, 'Failed to resolve user from session');
    }

    const clientId = process.env.STRIPE_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !baseUrl) {
      throw new AppError(
        500,
        'Stripe Connect is not configured correctly on the server',
      );
    }

    const redirectUri = `${baseUrl}/api/integrations/stripe/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: user.id,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.json({ url });
  } catch (error) {
    return handleError(error);
  }
}


