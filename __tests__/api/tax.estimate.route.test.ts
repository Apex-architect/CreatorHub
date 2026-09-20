import { NextRequest } from 'next/server';

import { GET as taxEstimateHandler } from '../../app/api/tax/estimate/route';
import { TaxService } from '../../lib/services/tax.service';
import { UserService } from '../../lib/services/user.service';

jest.mock('../../lib/services/tax.service');
jest.mock('../../lib/services/user.service');
jest.mock('../../lib/utils/auth', () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { sub: 'auth0|123', email: 'test@example.com' },
  }),
}));

describe('GET /api/tax/estimate', () => {
  it('returns tax breakdown for valid query', async () => {
    const mockBreakdown = {
      year: 2026,
      quarter: 1,
      incomeTotal: 100_000,
      deductibleExpensesTotal: 10_000,
      netIncome: 90_000,
      selfEmploymentTax: 12_000,
      federalIncomeTax: 15_000,
      totalEstimatedTax: 27_000,
      quarterlyPaymentAmount: 6_750,
      dueDate: '2026-04-15',
    };

    (UserService as jest.Mock).mockImplementation(() => ({
      createUser: jest
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'test@example.com' }),
    }));

    (TaxService as jest.Mock).mockImplementation(() => ({
      calculateQuarterlyEstimate: jest.fn().mockResolvedValue(mockBreakdown),
    }));

    const url = new URL('http://localhost/api/tax/estimate?year=2026&quarter=1');
    const request = new NextRequest(url.toString());

    const response = await taxEstimateHandler(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.totalEstimatedTax).toBe(27_000);
  });
});


