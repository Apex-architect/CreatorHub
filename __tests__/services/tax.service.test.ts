import type { SupabaseClient } from '@supabase/supabase-js';
import type { Redis } from '@upstash/redis';

import { TaxService } from '../../lib/services/tax.service';
import type { Database } from '../../lib/types/database.types';

type DbClient = SupabaseClient<Database>;

describe('TaxService', () => {
  const supabase = {
    from: jest.fn(),
  } as unknown as DbClient;

  const redis = {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  } as unknown as Redis;

  const service = new TaxService(supabase, redis);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates quarterly estimate with progressive tax and caching', async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);

    const mockSelect = jest.fn().mockReturnThis();
    const mockEq = jest.fn().mockReturnThis();
    const mockIs = jest.fn().mockReturnThis();
    const mockGte = jest.fn().mockReturnThis();
    const mockLte = jest.fn().mockResolvedValueOnce({
      data: [
        {
          id: 't1',
          user_id: 'u1',
          type: 'income',
          amount: 100_000,
          tax_deductible: null,
          date: '2026-02-01',
        },
        {
          id: 't2',
          user_id: 'u1',
          type: 'expense',
          amount: 10_000,
          tax_deductible: true,
          date: '2026-02-02',
        },
      ],
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      gte: mockGte,
      lte: mockLte,
    });

    // Mock tax_settings lookup to return single filer with no extra deductions.
    const mockTaxSettingsSelect = jest.fn().mockReturnThis();
    const mockTaxSettingsEq = jest.fn().mockReturnThis();
    const mockTaxSettingsMaybeSingle = jest
      .fn()
      .mockResolvedValueOnce({ data: { filing_status: 'single' }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          select: mockSelect,
          eq: mockEq,
          is: mockIs,
          gte: mockGte,
          lte: mockLte,
        };
      }
      if (table === 'tax_settings') {
        return {
          select: mockTaxSettingsSelect,
          eq: mockTaxSettingsEq,
          maybeSingle: mockTaxSettingsMaybeSingle,
        };
      }
      return {};
    });

    const breakdown = await service.calculateQuarterlyEstimate('u1', {
      year: 2026,
      quarter: 1,
    });

    expect(breakdown.incomeTotal).toBe(100_000);
    expect(breakdown.deductibleExpensesTotal).toBe(10_000);
    expect(breakdown.netIncome).toBe(90_000);
    expect(breakdown.selfEmploymentTax).toBeGreaterThan(0);
    expect(breakdown.federalIncomeTax).toBeGreaterThan(0);
    expect(redis.setex).toHaveBeenCalled();
  });
});


