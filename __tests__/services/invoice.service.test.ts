import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';

import type { Database } from '../../lib/types/database.types';
import { InvoiceService } from '../../lib/services/invoice.service';
import { PaymentService } from '../../lib/services/payment.service';

type DbClient = SupabaseClient<Database>;

describe('InvoiceService', () => {
  const supabase = {
    from: jest.fn(),
  } as unknown as DbClient;

  const redis = {} as unknown as Redis;

  const paymentService = {
    createTransaction: jest.fn(),
  } as unknown as PaymentService;

  const service = new InvoiceService(supabase, redis, paymentService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recomputes totals on createInvoice and ignores client totals', async () => {
    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnThis();
    const mockSingle = jest.fn().mockResolvedValueOnce({
      data: {
        id: 'inv1',
        user_id: 'u1',
        invoice_number: 'INV-202602-0001',
        subtotal: 200,
        tax_amount: 20,
        total: 220,
      },
      error: null,
    });

    const mockCountSelect = jest.fn().mockReturnThis();

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
          // For generateInvoiceNumber
          count: 0,
        };
      }
      return {};
    });

    (supabase.from as jest.Mock).mockReturnValueOnce({
      select: mockCountSelect,
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockResolvedValueOnce({ count: 0, error: null }),
    });

    const invoice = await service.createInvoice('u1', {
      invoice_date: '2026-02-01',
      due_date: '2026-02-15',
      bill_to_name: 'Acme Co.',
      bill_to_email: 'billing@acme.co',
      line_items: [
        { description: 'Service A', quantity: 1, rate: 100, amount: 0 },
        { description: 'Service B', quantity: 2, rate: 50, amount: 9999 },
      ],
      tax_rate: 10,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 200,
        tax_amount: 20,
        total: 220,
      }),
    );
    expect(invoice.total).toBe(220);
  });
});


