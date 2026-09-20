import { NextRequest } from 'next/server';
import Stripe from 'stripe';

import { POST as stripeWebhookHandler } from '../../app/api/integrations/stripe/webhook/route';
import { PaymentService } from '../../lib/services/payment.service';

jest.mock('../../lib/services/payment.service');

describe('POST /api/integrations/stripe/webhook', () => {
  const stripeWebhookSecret = 'whsec_test';

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;
  });

  it('returns 400 on missing signature', async () => {
    const request = new NextRequest('http://localhost/api/integrations/stripe/webhook', {
      method: 'POST',
      body: 'payload',
    } as RequestInit);

    const response = await stripeWebhookHandler(request);
    expect(response.status).toBe(400);
  });

  it('processes a valid event and returns 200', async () => {
    const stripe = new Stripe('sk_test_123', {
      apiVersion: '2023-10-16',
    });

    const event = {
      id: 'evt_1',
      type: 'charge.succeeded',
      data: {
        object: {
          id: 'ch_123',
          amount: 10_000,
          currency: 'usd',
          metadata: { user_id: 'user-1' },
        },
      },
    } as unknown as Stripe.Event;

    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: stripeWebhookSecret,
    });

    const request = new NextRequest('http://localhost/api/integrations/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
      },
      body: payload,
    } as RequestInit);

    (PaymentService as jest.Mock).mockImplementation(() => ({
      processStripeEvent: jest.fn().mockResolvedValue(undefined),
    }));

    const response = await stripeWebhookHandler(request);
    expect(response.status).toBe(200);
  });
});


