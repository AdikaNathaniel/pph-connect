export type PerformanceZone = 'green' | 'yellow' | 'orange' | 'red';

export interface PerformanceThresholds {
  accuracy?: number | null;
  rejectionRate?: number | null;
  iaa?: number | null;
  latencySeconds?: number | null;
}

export interface PerformanceMetrics {
  accuracy?: number | null;
  rejectionRate?: number | null;
  iaa?: number | null;
  latencySeconds?: number | null;
  thresholds: PerformanceThresholds;
  warningBufferPercent?: number | null;
  consecutiveDaysBelow?: number | null;
}

const DEFAULT_WARNING_BUFFER = 0.02;
const RED_ZONE_DAYS = 14;

const normalizeNumber = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
};

const normalizeThreshold = (value: number | null | undefined): number | null => normalizeNumber(value);

const resolveBuffer = (threshold: number | null, bufferPercent: number): number => {
  if (!threshold || threshold <= 0) {
    return bufferPercent;
  }
  return Math.abs(threshold) * bufferPercent;
};

type MetricEvaluation = 'good' | 'near' | 'below';

const evaluateMinimumMetric = (actual: number | null, threshold: number | null, bufferPercent: number): MetricEvaluation => {
  if (actual == null || threshold == null) return 'good';
  if (actual < threshold) return 'below';
  const buffer = resolveBuffer(threshold, bufferPercent);
  if (actual - threshold <= buffer) return 'near';
  return 'good';
};

const evaluateMaximumMetric = (actual: number | null, threshold: number | null, bufferPercent: number): MetricEvaluation => {
  if (actual == null || threshold == null) return 'good';
  if (actual > threshold) return 'below';
  const buffer = resolveBuffer(threshold, bufferPercent);
  if (threshold - actual <= buffer) return 'near';
  return 'good';
};

export function classifyPerformance(metrics: PerformanceMetrics): PerformanceZone {
  const bufferPercent = Math.max(0, normalizeNumber(metrics.warningBufferPercent ?? DEFAULT_WARNING_BUFFER) ?? DEFAULT_WARNING_BUFFER);
  const accuracyEval = evaluateMinimumMetric(
    normalizeNumber(metrics.accuracy),
    normalizeThreshold(metrics.thresholds?.accuracy),
    bufferPercent
  );
  const iaaEval = evaluateMinimumMetric(
    normalizeNumber(metrics.iaa),
    normalizeThreshold(metrics.thresholds?.iaa),
    bufferPercent
  );
  const rejectionEval = evaluateMaximumMetric(
    normalizeNumber(metrics.rejectionRate),
    normalizeThreshold(metrics.thresholds?.rejectionRate),
    bufferPercent
  );
  const latencyEval = evaluateMaximumMetric(
    normalizeNumber(metrics.latencySeconds),
    normalizeThreshold(metrics.thresholds?.latencySeconds),
    bufferPercent
  );

  const evaluations = [accuracyEval, iaaEval, rejectionEval, latencyEval];
  const hasBelow = evaluations.includes('below');
  const hasNear = evaluations.includes('near');

  const consecutiveDays = metrics.consecutiveDaysBelow ?? (hasBelow ? 1 : 0);

  if (hasBelow) {
    if (consecutiveDays >= RED_ZONE_DAYS) {
      return 'red';
    }
    return 'orange';
  }

  if (hasNear) {
    return 'yellow';
  }

  return 'green';
}
