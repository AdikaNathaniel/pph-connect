import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateWorkerQualityScore, refreshGoldStandardMetrics } from './qualityService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

type QualityMetricStub = {
  metric_type: string | null;
  metric_value: number | null;
  measured_at: string | null;
};

const createQueryBuilder = (rows: QualityMetricStub[], error: Error | null = null) => {
  const builder: any = {
    filters: [] as Array<[string, unknown]>,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function (column: string, value: unknown) {
      builder.filters.push([column, value]);
      return builder;
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then(onFulfilled: (value: { data: QualityMetricStub[] | null; error: Error | null }) => unknown) {
      return Promise.resolve(onFulfilled({ data: error ? null : rows, error }));
    },
  };
  return builder;
};

describe('qualityService.calculateWorkerQualityScore', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('returns null when worker id is missing', async () => {
    const result = await calculateWorkerQualityScore(null, null);
    expect(result).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('aggregates quality and accuracy metrics', async () => {
    const rows: QualityMetricStub[] = [
      { metric_type: 'quality', metric_value: 84.2, measured_at: '2025-01-01T00:00:00Z' },
      { metric_type: 'quality', metric_value: 91.8, measured_at: '2025-01-02T00:00:00Z' },
      { metric_type: 'accuracy', metric_value: 0.92, measured_at: '2025-01-03T00:00:00Z' },
      { metric_type: 'accuracy', metric_value: 0.96, measured_at: '2025-01-04T00:00:00Z' },
    ];

    const builder = createQueryBuilder(rows);
    vi.mocked(supabase.from).mockReturnValue(builder);

    const result = await calculateWorkerQualityScore('worker-1', 'project-123');

    expect(result).not.toBeNull();
    expect(result?.compositeScore).toBeCloseTo(88, 1);
    expect(result?.goldStandardAccuracy).toBeCloseTo(0.94, 2);
    expect(result?.qualitySamples).toBe(2);
    expect(result?.accuracySamples).toBe(2);
    expect(result?.recentMetrics).toHaveLength(4);
    expect(builder.eq).toHaveBeenCalledWith('worker_id', 'worker-1');
    expect(builder.eq).toHaveBeenCalledWith('project_id', 'project-123');
  });
});

describe('qualityService.refreshGoldStandardMetrics', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.from).mockReset();
  });

  it('returns nulls when worker id missing', async () => {
    const result = await refreshGoldStandardMetrics(null, null);
    expect(result).toEqual({ accuracy: null, trustRating: null });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('invokes supabase functions for accuracy and trust rating', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: 0.97, error: null })
      .mockResolvedValueOnce({ data: 82.3, error: null });

    const result = await refreshGoldStandardMetrics('worker-1', 'project-123');

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'calculate_gold_standard_accuracy', {
      p_worker_id: 'worker-1',
      p_project_id: 'project-123',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'update_worker_trust_rating', {
      p_worker_id: 'worker-1',
      p_project_id: 'project-123',
    });
    expect(result).toEqual({ accuracy: 0.97, trustRating: 82.3 });
  });
});
