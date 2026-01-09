import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type QualityMetricRow = Database['public']['Tables']['quality_metrics']['Row'];

export interface WorkerQualityScore {
  workerId: string;
  projectId: string | null;
  compositeScore: number | null;
  goldStandardAccuracy: number | null;
  qualitySamples: number;
  accuracySamples: number;
  recentMetrics: Array<{
    metricType: string;
    metricValue: number;
    measuredAt: string;
  }>;
}

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') {
    return null;
  }
  return Number.isFinite(value) ? value : null;
};

const average = (values: number[]): number | null => {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

export async function calculateWorkerQualityScore(
  workerId: string | null,
  projectId: string | null
): Promise<WorkerQualityScore | null> {
  if (!workerId) {
    return null;
  }

  let query = supabase
    .from('quality_metrics')
    .select('metric_type, metric_value, measured_at')
    .eq('worker_id', workerId)
    .order('measured_at', { ascending: false })
    .limit(200);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('qualityService: failed to load metrics', error);
    return null;
  }

  const rows = (data ?? []) as QualityMetricRow[];
  const qualityValues: number[] = [];
  const accuracyValues: number[] = [];

  rows.forEach((row) => {
    const normalized = normalizeNumber(row.metric_value);
    if (normalized == null) {
      return;
    }
    if ((row.metric_type ?? '').toLowerCase() === 'quality') {
      qualityValues.push(normalized);
    } else if ((row.metric_type ?? '').toLowerCase() === 'accuracy') {
      accuracyValues.push(normalized);
    }
  });

  const qualityAverage = average(qualityValues);
  const accuracyAverage = average(accuracyValues);

  const compositeScore =
    qualityAverage != null
      ? Number(qualityAverage.toFixed(2))
      : accuracyAverage != null
        ? Number((accuracyAverage * 100).toFixed(2))
        : null;

  return {
    workerId,
    projectId: projectId ?? null,
    compositeScore,
    goldStandardAccuracy: accuracyAverage,
    qualitySamples: qualityValues.length,
    accuracySamples: accuracyValues.length,
    recentMetrics: rows.slice(0, 25).map((row) => ({
      metricType: row.metric_type ?? 'unknown',
      metricValue: normalizeNumber(row.metric_value) ?? 0,
      measuredAt: row.measured_at ?? new Date().toISOString(),
    })),
  };
}

export async function getGoldStandardAccuracy(workerId: string | null, projectId: string | null) {
  if (!workerId) {
    return null;
  }

  const { data, error } = await supabase.rpc('calculate_gold_standard_accuracy', {
    p_worker_id: workerId,
    p_project_id: projectId,
  });

  if (error) {
    console.warn('qualityService: failed to calculate gold accuracy', error);
    return null;
  }

  return typeof data === 'number' ? data : null;
}

export async function updateWorkerTrustRating(workerId: string | null, projectId: string | null) {
  if (!workerId) {
    return null;
  }

  const { data, error } = await supabase.rpc('update_worker_trust_rating', {
    p_worker_id: workerId,
    p_project_id: projectId,
  });

  if (error) {
    console.warn('qualityService: failed to update trust rating', error);
    return null;
  }

  return typeof data === 'number' ? data : null;
}

export async function getInterAnnotatorAgreementByProject(projectId: string | null) {
  if (!projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from('quality_metrics')
    .select('metric_value, measured_at')
    .eq('project_id', projectId)
    .eq('metric_type', 'iaa')
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('qualityService: failed to load IAA metric', error);
    return null;
  }

  return data?.metric_value ?? null;
}

export async function refreshGoldStandardMetrics(workerId: string | null, projectId: string | null) {
  if (!workerId) {
    return { accuracy: null, trustRating: null };
  }

  const [accuracy, trustRating] = await Promise.all([
    getGoldStandardAccuracy(workerId, projectId),
    updateWorkerTrustRating(workerId, projectId),
  ]);

  return { accuracy, trustRating };
}
