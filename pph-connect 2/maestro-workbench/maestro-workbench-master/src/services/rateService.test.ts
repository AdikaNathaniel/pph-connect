import { describe, it, expect, beforeEach, vi } from 'vitest';
import getRateForWorker from './rateService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

type TablePayloads = Record<string, unknown>;

const createQueryBuilder = (payload: unknown) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: payload, error: null }),
    then(onFulfilled: (value: { data: unknown; error: null }) => unknown) {
      return Promise.resolve(onFulfilled({ data: payload, error: null }));
    },
  };
  return builder;
};

const setupTablePayloads = (payloads: TablePayloads) => {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    return createQueryBuilder(payloads[table] ?? null);
  });
};

describe('rateService.getRateForWorker', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('prefers worker locale when rate exists', async () => {
    setupTablePayloads({
      worker_accounts: { locale: 'tagalog' },
      projects: { locale: null },
      locale_mappings: [
        { client_locale: 'Tagalog', iso_locale: 'tl-PH' },
      ],
      rates_payable: [
        {
          id: 'rate-worker',
          rate_per_unit: 0.12,
          rate_per_hour: 4.5,
          currency: 'USD',
          locale: 'tl-PH',
        },
      ],
    });

    const quote = await getRateForWorker('worker-1', 'project-1', '2025-01-10');

    expect(quote).toEqual({
      rateCardId: 'rate-worker',
      ratePerUnit: 0.12,
      ratePerHour: 4.5,
      currency: 'USD',
      locale: 'tl-PH',
      source: 'worker',
    });
  });

  it('falls back to project locale when worker locale missing', async () => {
    setupTablePayloads({
      worker_accounts: { locale: null },
      projects: { locale: 'EN-GB' },
      locale_mappings: [
        { client_locale: 'en-gb', iso_locale: 'en-GB' },
      ],
      rates_payable: [
        {
          id: 'rate-project',
          rate_per_unit: 0.2,
          rate_per_hour: 6,
          currency: 'GBP',
          locale: 'en-GB',
        },
      ],
    });

    const quote = await getRateForWorker('worker-2', 'project-9', '2025-01-10');

    expect(quote.source).toBe('project');
    expect(quote.rateCardId).toBe('rate-project');
    expect(quote.currency).toBe('GBP');
  });

  it('returns fallback quote when no rate matches', async () => {
    setupTablePayloads({
      worker_accounts: { locale: null },
      projects: { locale: null },
      locale_mappings: [],
      rates_payable: [],
    });

    const quote = await getRateForWorker('worker-3', 'project-3', '2025-01-10');

    expect(quote).toEqual({
      rateCardId: null,
      ratePerUnit: null,
      ratePerHour: null,
      currency: null,
      locale: null,
      source: 'fallback',
    });
  });
});
