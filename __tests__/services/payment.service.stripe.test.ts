import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';
import type Stripe from 'stripe';

import type { Database } from '../../lib/types/database.types';
import { PaymentService } from '../../lib/services/payment.service';

type DbClient = SupabaseClient<Database>;

describe('PaymentService Stripe integration', () => {
  const supabase = {
    from: jest.fn(),
  } as unknown as DbClient;

  const redis = {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  } as unknown as Redis;

  const service = new PaymentService(supabase, redis);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores charge.succeeded without user_id in metadata', async () => {
    const event = {
      type: 'charge.succeeded',
      data: {
        object: {
          id: 'ch_1',
          amount: 10_000,
          currency: 'usd',
          metadata: {},
          billing_details: {},
        },
      },
    } as unknown as Stripe.Event;

    await expect(service.processStripeEvent(event)).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('creates transaction only once per Stripe charge', async () => {
    const event = {
      type: 'charge.succeeded',
      data: {
        object: {
          id: 'ch_2',
          amount: 50_000,
          currency: 'usd',
          metadata: { user_id: 'user-1' },
          created: 1_700_000_000,
          description: 'Test charge',
          billing_details: { name: 'Client' },
        },
      },
    } as unknown as Stripe.Event;

    const mockMaybeSingle = jest
      .fn()
      // First call: no existing transaction
      .mockResolvedValueOnce({ data: null, error: null })
      // Second call: existing transaction present
      .mockResolvedValueOnce({
        data: { id: 'tx1' },
        error: null,
      });

    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValueOnce({
      data: { id: 'tx1' },
      error: null,
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
          insert: mockInsert,
          single: mockSingle,
        };
      }
      return {};
    });

    await service.processStripeEvent(event);
    await service.processStripeEvent(event);

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});


