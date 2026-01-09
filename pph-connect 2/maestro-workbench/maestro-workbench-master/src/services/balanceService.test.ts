import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateWorkerBalance, getBalanceBreakdown } from './balanceService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createWorkStatsQuery = (payload: unknown, error: Error | null = null) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then(onFulfilled: (value: { data: unknown; error: Error | null }) => unknown) {
      return Promise.resolve(onFulfilled({ data: error ? null : payload, error }));
    },
  };
  return builder;
};

describe('balanceService.calculateWorkerBalance', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('aggregates total earnings and currency', async () => {
    const aggregateRows = [{ sum_earnings: 125.75, currency: 'USD' }];
    vi.mocked(supabase.from).mockReturnValueOnce(createWorkStatsQuery(aggregateRows));

    const result = await calculateWorkerBalance('worker-1', '2025-01-01', '2025-01-31');

    expect(result).toEqual({ total: 125.75, currency: 'USD' });
  });
});

describe('balanceService.getBalanceBreakdown', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('groups earnings by project and surfaces dominant currency total', async () => {
    const breakdownRows = [
      { project_id: 'p1', earnings: 40, currency: 'USD' },
      { project_id: 'p1', earnings: 10, currency: 'USD' },
      { project_id: 'p2', earnings: 60, currency: 'EUR' },
      { project_id: null, earnings: 5, currency: null },
    ];

    vi.mocked(supabase.from).mockReturnValueOnce(createWorkStatsQuery(breakdownRows));

    const result = await getBalanceBreakdown('worker-1', '2025-01-01', '2025-01-31');

    expect(result.total).toEqual({ total: 60, currency: 'EUR' });
    expect(result.breakdown).toEqual(
      expect.arrayContaining([
        { projectId: 'p1', earnings: 50, currency: 'USD' },
        { projectId: 'p2', earnings: 60, currency: 'EUR' },
        { projectId: null, earnings: 5, currency: null },
      ])
    );
  });

  it('returns zero structure when no work stats found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(createWorkStatsQuery([]));

    const result = await getBalanceBreakdown('worker-2', '2025-01-01', '2025-01-31');

    expect(result).toEqual({
      total: { total: 0, currency: null },
      breakdown: [],
    });
  });
});
