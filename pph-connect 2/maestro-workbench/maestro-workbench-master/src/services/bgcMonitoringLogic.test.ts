import { describe, it, expect } from 'vitest';
import { evaluateBGCStatuses, type BGCWorkerRecord } from './bgcMonitoringLogic';

describe('evaluateBGCStatuses', () => {
  const today = new Date('2025-01-01T00:00:00Z');

  let counter = 0;
  const worker = (overrides: Partial<BGCWorkerRecord>): BGCWorkerRecord => ({
    id: overrides.id ?? `w${++counter}`,
    bgc_expiration_date: overrides.bgc_expiration_date ?? null,
    full_name: overrides.full_name ?? 'Test Worker',
  });

  it('categorizes workers into reminder buckets', () => {
    const input: BGCWorkerRecord[] = [
      worker({ id: 'w1', bgc_expiration_date: '2025-03-01' }), // 59 days -> remind60
      worker({ id: 'w2', bgc_expiration_date: '2025-01-25' }), // 24 days -> remind30
      worker({ id: 'w3', bgc_expiration_date: '2025-01-05' }), // 4 days -> remind7
      worker({ id: 'w4', bgc_expiration_date: '2024-12-30' }), // -2 days -> overdue
      worker({ id: 'w5' }), // missing date -> ignored
    ];

    const result = evaluateBGCStatuses(input, today);

    expect(result.remind60.map((w) => w.id)).toEqual(['w1']);
    expect(result.remind30.map((w) => w.id)).toEqual(['w2']);
    expect(result.remind7.map((w) => w.id)).toEqual(['w3']);
    expect(result.overdue.map((w) => w.id)).toEqual(['w4']);
  });

  it('returns empty buckets when no valid dates', () => {
    const result = evaluateBGCStatuses([worker({ id: 'a' })], today);
    expect(result).toEqual({ remind60: [], remind30: [], remind7: [], overdue: [] });
  });
});
