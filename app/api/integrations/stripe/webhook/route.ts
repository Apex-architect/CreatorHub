import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { PaymentService } from '../../../../../lib/services/payment.service';
import { supabase } from '../../../../../lib/db/supabase';
import { redis } from '../../../../../lib/db/redis';
import { logger } from '../../../../../lib/utils/logger';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey || !stripeWebhookSecret) {
  // Fail fast in development if Stripe is not configured.
  // In production, this would surface as a deployment/config error.
  // eslint-disable-next-line no-console
  console.error('Stripe environment variables are not configured correctly.');
}

const stripe = new Stripe(stripeSecretKey ?? '', {
  apiVersion: '2023-10-16',
});

const paymentService = new PaymentService(supabase, redis);

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');

  if (!signature || !stripeWebhookSecret) {
    logger.warn('stripe.webhook.missing_signature');
    return new NextResponse('Bad Request', { status: 400 });
  }

  const rawBody = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    );

    await paymentService.processStripeEvent(event);

    // Webhook-safe: acknowledge quickly after delegating to the service.
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'StripeSignatureVerificationError'
    ) {
      logger.warn('stripe.webhook.signature_invalid', {
        message: error.message,
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }

    logger.error('stripe.webhook.unhandled_error', error as Error);

    // Return 200 OK to avoid repeated retries while still logging the error.
    return new NextResponse('OK', { status: 200 });
  }
}



// feat: build users/me profile endpoint
// 2026-01-08T15:06:00

// feat: add feature flags for demo YouTube and Plaid
// 2026-02-08T10:41:00

// feat: map Stripe charges to internal transactions
// 2026-03-11T15:16:00

// feat: create settings page scaffold
// 2026-04-10T10:51:00

// feat: add creator logo and address to invoices
// 2026-05-11T15:26:00

// feat: create modular monolith service boundaries
// 2026-06-11T10:01:00

// feat: implement invoice duplicate action
// 2026-07-11T15:36:00

// feat: map customer email from Stripe when present
// 2026-08-11T10:11:00

// feat: show tax estimate confidence notes
// 2026-09-11T15:46:00
