import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAvailableProjects } from './accessService';
import { supabase } from '@/integrations/supabase/client';
import { calculateWorkerQualityScore } from '@/services/qualityService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/services/qualityService', () => ({
  calculateWorkerQualityScore: vi.fn(),
}));

type TablePayload = Record<string, unknown>;

const createQueryBuilder = (payload: unknown, error: Error | null = null) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then(onFulfilled: (value: { data: unknown; error: Error | null }) => unknown) {
      return Promise.resolve(onFulfilled({ data: error ? null : payload, error }));
    },
  };
  return builder;
};

const setupSupabaseTables = (payload: TablePayload) => {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    return createQueryBuilder(payload[table] ?? []);
  });
};

describe('accessService.getAvailableProjects', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
    vi.mocked(calculateWorkerQualityScore).mockReset();
  });

  it('allows projects when worker meets thresholds and requirements', async () => {
    const projectListing = [
      {
        id: 'listing-1',
        project_id: 'project-1',
        required_skills: ['Transcription'],
        project: {
          id: 'project-1',
          project_name: 'Healthcare QA',
          requires_training_gate: false,
          required_qualifications: ['Medical QA'],
        },
      },
    ];

    setupSupabaseTables({
      project_listings: projectListing,
      performance_thresholds: [{ project_id: 'project-1', metric_type: 'quality', threshold_min: 80 }],
      worker_skills: [{ skill_name: 'transcription', verified: true }],
      skill_assessments: [{ skill_name: 'medical qa', passed: true, expires_at: null }],
      training_gates: [],
      auto_removals: [],
    });

    vi.mocked(calculateWorkerQualityScore).mockResolvedValue({
      workerId: 'worker-1',
      projectId: null,
      compositeScore: 85,
      goldStandardAccuracy: 0.95,
      qualitySamples: 10,
      accuracySamples: 5,
      recentMetrics: [],
    });

    const result = await getAvailableProjects('worker-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      allowed: true,
      reasons: [],
      qualityScore: 85,
      qualityThreshold: 80,
    });
  });

  it('flags missing requirements and violations', async () => {
    const projectListing = [
      {
        id: 'listing-2',
        project_id: 'project-2',
        required_skills: ['Translation'],
        project: {
          id: 'project-2',
          project_name: 'Finance QA',
          requires_training_gate: true,
          required_qualifications: ['Finance Cert'],
        },
      },
    ];

    const violationDate = new Date().toISOString();

    setupSupabaseTables({
      project_listings: projectListing,
      performance_thresholds: [{ project_id: 'project-2', metric_type: 'quality', threshold_min: 90 }],
      worker_skills: [{ skill_name: 'transcription', verified: true }],
      skill_assessments: [],
      training_gates: [{ project_id: 'project-2', status: 'pending' }],
      auto_removals: [{ project_id: 'project-2', removal_reason: 'Quality violation', removed_at: violationDate }],
    });

    vi.mocked(calculateWorkerQualityScore).mockResolvedValue({
      workerId: 'worker-2',
      projectId: null,
      compositeScore: 75,
      goldStandardAccuracy: 0.8,
      qualitySamples: 3,
      accuracySamples: 2,
      recentMetrics: [],
    });

    const result = await getAvailableProjects('worker-2');

    expect(result[0].allowed).toBe(false);
    expect(result[0].reasons).toEqual(
      expect.arrayContaining(['quality_threshold', 'missing_skills', 'missing_qualifications', 'training_incomplete', 'recent_violation'])
    );
  });
});
