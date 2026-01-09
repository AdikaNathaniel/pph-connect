import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { classifyPerformance, type PerformanceZone } from '@/services/performanceMonitoringLogic';
import { handleProgressiveActions } from '@/services/progressiveActionService';

const LOOKBACK_DAYS = 30;
const METRIC_TYPES = ['accuracy', 'quality', 'consistency', 'speed'] as const;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PerformanceSnapshot {
  workerId: string;
  projectId: string;
  accuracy7d: number | null;
  accuracy30d: number | null;
  rejectionRate7d: number | null;
  rejectionRate30d: number | null;
  iaa7d: number | null;
  iaa30d: number | null;
  latency7d: number | null;
  latency30d: number | null;
  zone: PerformanceZone;
  consecutiveDaysBelow: number;
  evaluatedAt: string;
  reasons: string[];
}

type QualityMetricRow = Database['public']['Tables']['quality_metrics']['Row'];
type ThresholdRow = Database['public']['Tables']['performance_thresholds']['Row'];
type MonitoredMetricType = (typeof METRIC_TYPES)[number];

interface RollingSummary {
  value: number | null;
  avg7d: number | null;
  avg30d: number | null;
  measuredAt: string | null;
}

interface MetricGroup {
  workerId: string;
  projectId: string;
  metrics: Record<MonitoredMetricType, QualityMetricRow[]>;
}

interface MetricThresholdMeta {
  min?: number | null;
  max?: number | null;
  graceDays?: number | null;
}

interface ProjectThresholds {
  accuracy?: MetricThresholdMeta;
  rejectionRate?: MetricThresholdMeta;
  iaa?: MetricThresholdMeta;
  latencySeconds?: MetricThresholdMeta;
}

const toNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeRate = (value: number | null): number | null => {
  if (value == null) return null;
  if (value > 1) {
    return Math.min(1, Math.max(0, value / 100));
  }
  return Math.min(1, Math.max(0, value));
};

const toRejectionRate = (value: number | null): number | null => {
  const rate = normalizeRate(value);
  if (rate == null) return null;
  return Math.min(1, Math.max(0, 1 - rate));
};

const sortByMeasuredAtDesc = (rows: QualityMetricRow[]): QualityMetricRow[] =>
  [...rows].sort((a, b) => {
    const left = a.measured_at ? new Date(a.measured_at).getTime() : 0;
    const right = b.measured_at ? new Date(b.measured_at).getTime() : 0;
    return right - left;
  });

const summarizeMetric = (
  rows: QualityMetricRow[],
  transform?: (value: number | null) => number | null
): RollingSummary => {
  if (!rows.length) {
    return { value: null, avg7d: null, avg30d: null, measuredAt: null };
  }
  const latest = sortByMeasuredAtDesc(rows)[0];
  const apply = (value: number | null) => (transform ? transform(value) : value);
  return {
    value: apply(toNumber(latest.metric_value)),
    avg7d: apply(toNumber(latest.rolling_avg_7d)),
    avg30d: apply(toNumber(latest.rolling_avg_30d)),
    measuredAt: latest.measured_at ?? null,
  };
};

const adjustForGrace = (violations: number, graceDays?: number | null) => {
  if (!graceDays || graceDays <= 0) return violations;
  return Math.max(0, violations - graceDays);
};

const countConsecutiveViolations = (
  rows: QualityMetricRow[],
  threshold: MetricThresholdMeta | undefined,
  comparator: 'min' | 'max'
) => {
  if (!threshold) return 0;
  const sorted = sortByMeasuredAtDesc(rows);
  let violations = 0;
  for (const row of sorted) {
    const value = toNumber(row.metric_value);
    if (value == null) {
      continue;
    }
    const violates =
      comparator === 'min'
        ? threshold.min != null && value < threshold.min
        : threshold.max != null && value > threshold.max;
    if (violates) {
      violations += 1;
    } else {
      break;
    }
  }
  return adjustForGrace(violations, threshold.graceDays);
};

const groupMetricRows = (rows: QualityMetricRow[]): MetricGroup[] => {
  const groups = new Map<string, MetricGroup>();
  rows.forEach((row) => {
    if (!row.worker_id || !row.project_id) return;
    const key = `${row.worker_id}:${row.project_id}`;
    const existing = groups.get(key);
    if (existing) {
      const metricType = (row.metric_type as MonitoredMetricType) ?? 'accuracy';
      if (existing.metrics[metricType]) {
        existing.metrics[metricType].push(row);
      }
      return;
    }
    const baseline: Record<MonitoredMetricType, QualityMetricRow[]> = {
      accuracy: [],
      quality: [],
      consistency: [],
      speed: [],
    };
    const metricType = (row.metric_type as MonitoredMetricType) ?? 'accuracy';
    if (baseline[metricType]) {
      baseline[metricType].push(row);
    }
    groups.set(key, {
      workerId: row.worker_id,
      projectId: row.project_id,
      metrics: baseline,
    });
  });
  return Array.from(groups.values());
};

const buildThresholdMap = (rows: ThresholdRow[]): Map<string, ProjectThresholds> => {
  const map = new Map<string, ProjectThresholds>();
  rows.forEach((row) => {
    if (!row.project_id) return;
    const existing = map.get(row.project_id) ?? {};
    const common: MetricThresholdMeta = {
      min: toNumber(row.threshold_min),
      max: toNumber(row.threshold_max),
      graceDays: row.grace_period_days ?? 0,
    };
    switch (row.metric_type) {
      case 'accuracy':
        existing.accuracy = { min: common.min, graceDays: common.graceDays };
        break;
      case 'quality':
        existing.rejectionRate = { max: common.max, graceDays: common.graceDays };
        break;
      case 'consistency':
        existing.iaa = { min: common.min, graceDays: common.graceDays };
        break;
      case 'speed':
        existing.latencySeconds = { max: common.max, graceDays: common.graceDays };
        break;
      default:
        break;
    }
    map.set(row.project_id, existing);
  });
  return map;
};

const pickValue = (summary: RollingSummary): number | null => summary.avg7d ?? summary.avg30d ?? summary.value;

const pickLatestTimestamp = (summaries: RollingSummary[]) => {
  const timestamps = summaries
    .map((summary) => (summary.measuredAt ? new Date(summary.measuredAt).getTime() : 0))
    .filter((time) => time > 0);
  if (!timestamps.length) {
    return new Date().toISOString();
  }
  const latest = Math.max(...timestamps);
  return new Date(latest).toISOString();
};

export async function collectPerformanceSnapshots(options?: {
  projectId?: string;
  workerId?: string;
}): Promise<PerformanceSnapshot[]> {
  const lookbackStart = new Date(Date.now() - LOOKBACK_DAYS * MILLISECONDS_PER_DAY).toISOString();

  let metricsQuery = supabase
    .from('quality_metrics')
    .select('worker_id, project_id, metric_type, metric_value, rolling_avg_7d, rolling_avg_30d, measured_at')
    .gte('measured_at', lookbackStart)
    .in('metric_type', METRIC_TYPES as unknown as string[]);

  if (options?.projectId) {
    metricsQuery = metricsQuery.eq('project_id', options.projectId);
  }
  if (options?.workerId) {
    metricsQuery = metricsQuery.eq('worker_id', options.workerId);
  }

  const thresholdsQuery = supabase
    .from('performance_thresholds')
    .select('project_id, metric_type, threshold_min, threshold_max, grace_period_days');

  const [metricsResult, thresholdsResult] = await Promise.all([metricsQuery, thresholdsQuery]);

  if (metricsResult.error) {
    console.warn('performanceMonitoringService: failed to load quality metrics', metricsResult.error);
    return [];
  }

  if (thresholdsResult.error) {
    console.warn('performanceMonitoringService: failed to load performance thresholds', thresholdsResult.error);
    return [];
  }

  const grouped = groupMetricRows((metricsResult.data ?? []) as QualityMetricRow[]);
  const thresholdMap = buildThresholdMap((thresholdsResult.data ?? []) as ThresholdRow[]);

  const snapshots: PerformanceSnapshot[] = [];

  grouped.forEach((group) => {
    const projectThresholds = thresholdMap.get(group.projectId) ?? {};

    const accuracySummary = summarizeMetric(group.metrics.accuracy, normalizeRate);
    const rejectionSummary = summarizeMetric(group.metrics.quality, toRejectionRate);
    const iaaSummary = summarizeMetric(group.metrics.consistency, normalizeRate);
    const latencySummary = summarizeMetric(group.metrics.speed);

    const violationDays = Math.max(
      countConsecutiveViolations(group.metrics.accuracy, projectThresholds.accuracy, 'min'),
      countConsecutiveViolations(group.metrics.quality, projectThresholds.rejectionRate, 'max'),
      countConsecutiveViolations(group.metrics.consistency, projectThresholds.iaa, 'min'),
      countConsecutiveViolations(group.metrics.speed, projectThresholds.latencySeconds, 'max')
    );

    const reasons: string[] = [];
    const accuracyValue = pickValue(accuracySummary);
    if (projectThresholds.accuracy?.min != null && accuracyValue != null && accuracyValue < projectThresholds.accuracy.min) {
      reasons.push('accuracy_below_threshold');
    }
    const rejectionValue = pickValue(rejectionSummary);
    if (projectThresholds.rejectionRate?.max != null && rejectionValue != null && rejectionValue > projectThresholds.rejectionRate.max) {
      reasons.push('rejection_rate_above_threshold');
    }
    const iaaValue = pickValue(iaaSummary);
    if (projectThresholds.iaa?.min != null && iaaValue != null && iaaValue < projectThresholds.iaa.min) {
      reasons.push('iaa_below_threshold');
    }
    const latencyValue = pickValue(latencySummary);
    if (projectThresholds.latencySeconds?.max != null && latencyValue != null && latencyValue > projectThresholds.latencySeconds.max) {
      reasons.push('latency_above_threshold');
    }

    const zone = classifyPerformance({
      accuracy: accuracyValue,
      rejectionRate: rejectionValue,
      iaa: iaaValue,
      latencySeconds: latencyValue,
      thresholds: {
        accuracy: projectThresholds.accuracy?.min ?? null,
        rejectionRate: projectThresholds.rejectionRate?.max ?? null,
        iaa: projectThresholds.iaa?.min ?? null,
        latencySeconds: projectThresholds.latencySeconds?.max ?? null,
      },
      consecutiveDaysBelow: violationDays,
      warningBufferPercent: 0.02,
    });

    snapshots.push({
      workerId: group.workerId,
      projectId: group.projectId,
      accuracy7d: accuracySummary.avg7d,
      accuracy30d: accuracySummary.avg30d,
      rejectionRate7d: rejectionSummary.avg7d,
      rejectionRate30d: rejectionSummary.avg30d,
      iaa7d: iaaSummary.avg7d,
      iaa30d: iaaSummary.avg30d,
      latency7d: latencySummary.avg7d,
      latency30d: latencySummary.avg30d,
      zone,
      consecutiveDaysBelow: violationDays,
      evaluatedAt: pickLatestTimestamp([accuracySummary, rejectionSummary, iaaSummary, latencySummary]),
      reasons,
    });
  });

  return snapshots;
}

type ZoneBreakdown = Record<PerformanceZone, number>;

const buildZoneBreakdown = (snapshots: PerformanceSnapshot[]): ZoneBreakdown => {
  return snapshots.reduce<ZoneBreakdown>(
    (acc, snapshot) => {
      acc[snapshot.zone] = (acc[snapshot.zone] ?? 0) + 1;
      return acc;
    },
    { green: 0, yellow: 0, orange: 0, red: 0 }
  );
};

export async function runDailyPerformanceCheck(options?: { projectId?: string; workerId?: string }) {
  const snapshots = await collectPerformanceSnapshots(options);
  if (!snapshots.length) {
    return { processed: 0, removalsQueued: 0, zoneBreakdown: { green: 0, yellow: 0, orange: 0, red: 0 } };
  }

  const zoneBreakdown = buildZoneBreakdown(snapshots);
  const violations = snapshots.filter((snapshot) => snapshot.zone !== 'green');

  if (!violations.length) {
    return { processed: snapshots.length, removalsQueued: 0, zoneBreakdown };
  }

  await handleProgressiveActions(violations);

  const { error } = await supabase.from('performance_reviews').insert(
    violations.map((snapshot) => ({
      worker_id: snapshot.workerId,
      review_period_start: new Date(Date.now() - LOOKBACK_DAYS * MILLISECONDS_PER_DAY).toISOString(),
      review_period_end: new Date().toISOString(),
      review_data: {
        projectId: snapshot.projectId,
        zone: snapshot.zone,
        consecutiveDaysBelow: snapshot.consecutiveDaysBelow,
        reasons: snapshot.reasons,
        accuracy7d: snapshot.accuracy7d,
        rejectionRate7d: snapshot.rejectionRate7d,
        iaa7d: snapshot.iaa7d,
        latency7d: snapshot.latency7d,
      },
    }))
  );

  if (error) {
    console.warn('performanceMonitoringService: failed to persist performance review snapshot', error);
  }

  return { processed: snapshots.length, removalsQueued: violations.length, zoneBreakdown };
}
