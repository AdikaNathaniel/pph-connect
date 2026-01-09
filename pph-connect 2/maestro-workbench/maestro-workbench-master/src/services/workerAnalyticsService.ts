import { supabase } from '@/integrations/supabase/client';

export interface WorkerAnalyticsSnapshot {
  tasksPerDayTotal: number;
  earningsTotal: number;
  averageQuality: number | null;
  averageSecondsPerTask: number | null;
  daysTracked: number;
}

export interface WorkerAnalyticsSummary {
  tasksPerDay: Array<{ date: string; tasks: number; earnings: number }>;
  qualityTrend: Array<{ date: string; score: number }>;
  earningsPerDay: Array<{ date: string; earnings: number }>;
  speedTrend: Array<{ date: string; secondsPerTask: number }>;
  benchmarks: {
    qualityPercentile: number | null;
    speedVsPeers: number | null;
    tasksVsPeers: number | null;
  };
  insights: string[];
  summary: WorkerAnalyticsSnapshot;
}

const DEFAULT_SUMMARY: WorkerAnalyticsSummary = {
  tasksPerDay: [],
  qualityTrend: [],
  earningsPerDay: [],
  speedTrend: [],
  benchmarks: { qualityPercentile: null, speedVsPeers: null, tasksVsPeers: null },
  insights: [],
  summary: {
    tasksPerDayTotal: 0,
    earningsTotal: 0,
    averageQuality: null,
    averageSecondsPerTask: null,
    daysTracked: 0,
  },
};

const CACHE_TTL_MS = 60_000;
const analyticsCache = new Map<string, { expiresAt: number; value: WorkerAnalyticsSummary }>();

const getCacheKey = (workerId: string, days: number) => `${workerId}:${days}`;

const formatISODate = (date: string | null | undefined) => {
  if (!date) return null;
  return date.slice(0, 10);
};

const normalizeDailyRows = (
  rows: Array<{ work_date?: string | null; units?: number | null; earnings?: number | null; hours?: number | null }>
) => {
  return (rows ?? [])
    .map((row) => ({
      date: formatISODate(row.work_date ?? null),
      tasks: Number(row.units ?? 0),
      earnings: Number(row.earnings ?? 0),
      hours: Number(row.hours ?? 0),
    }))
    .filter((entry) => Boolean(entry.date))
    .sort((a, b) => (a.date! > b.date! ? 1 : -1)) as Array<{ date: string; tasks: number; earnings: number; hours: number }>;
};

const averageQuality = (rows: Array<{ metric_value?: number | null }>) => {
  const scores = rows.map((row) => Number(row.metric_value ?? 0)).filter((score) => Number.isFinite(score));
  if (!scores.length) {
    return null;
  }
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
};

export async function fetchWorkerAnalyticsSummary(workerId: string | null, days = 30): Promise<WorkerAnalyticsSummary> {
  if (!workerId) {
    return DEFAULT_SUMMARY;
  }

  const cacheKey = getCacheKey(workerId, days);
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const [{ data: workerDailyStats, error: workerStatsError }, { data: qualityMetrics, error: qualityError }, { data: peerDailyStats, error: peerError }] =
    await Promise.all([
      supabase
        .from('worker_daily_stats')
        .select('work_date, units, hours, earnings')
        .eq('worker_id', workerId)
        .gte('work_date', cutoffDate)
        .order('work_date', { ascending: true }),
      supabase
        .from('quality_metrics')
        .select('measured_at, metric_value')
        .eq('worker_id', workerId)
        .eq('metric_type', 'quality')
        .gte('measured_at', `${cutoffDate}T00:00:00`),
      supabase
        .from('worker_daily_stats')
        .select('worker_id, work_date, units, hours')
        .gte('work_date', cutoffDate)
        .limit(5000),
    ]);

  if (workerStatsError) {
    console.warn('workerAnalyticsService: failed to load worker stats', workerStatsError);
  }
  if (qualityError) {
    console.warn('workerAnalyticsService: failed to load quality metrics', qualityError);
  }
  if (peerError) {
    console.warn('workerAnalyticsService: failed to load peer stats', peerError);
  }

  const workerDaily = normalizeDailyRows(workerDailyStats ?? []);
  const tasksPerDay = workerDaily.map((entry) => ({ date: entry.date, tasks: entry.tasks, earnings: entry.earnings }));
  const earningsPerDay = workerDaily.map((entry) => ({ date: entry.date, earnings: entry.earnings }));
  const speedTrend = workerDaily.map((entry) => ({
    date: entry.date,
    secondsPerTask: entry.tasks > 0 ? Math.round((entry.hours * 3600) / entry.tasks) : 0,
  }));

  const qualityTrend =
    qualityMetrics?.map((row) => ({
      date: formatISODate(row.measured_at ?? null) ?? '',
      score: Number(row.metric_value ?? 0),
    })) ?? [];

  const workerQualityAverage = averageQuality(qualityMetrics ?? []);
  const totalWorkerTasks = workerDaily.reduce((sum, entry) => sum + entry.tasks, 0);
  const totalWorkerHours = workerDaily.reduce((sum, entry) => sum + entry.hours, 0);
  const workerSecondsPerTask =
    totalWorkerTasks > 0 && totalWorkerHours > 0 ? (totalWorkerHours * 3600) / totalWorkerTasks : null;

  const peerDaily = normalizeDailyRows(peerDailyStats ?? []);
  const totalPeerTasks = peerDaily.reduce((sum, entry) => sum + entry.tasks, 0);
  const totalPeerHours = peerDaily.reduce((sum, entry) => sum + entry.hours, 0);
  const peerSecondsPerTask =
    totalPeerTasks > 0 && totalPeerHours > 0 ? (totalPeerHours * 3600) / totalPeerTasks : null;

  const tasksVsPeers =
    totalPeerTasks > 0 ? (totalWorkerTasks - totalPeerTasks / Math.max(1, peerStats?.length ?? 1)) / totalPeerTasks : null;
  const speedVsPeers =
    workerSecondsPerTask != null && peerSecondsPerTask
      ? (peerSecondsPerTask - workerSecondsPerTask) / peerSecondsPerTask
      : null;

  const benchmarks = {
    qualityPercentile: workerQualityAverage != null ? Math.min(99, Math.max(1, Math.round(workerQualityAverage))) : null,
    speedVsPeers,
    tasksVsPeers,
  };

  const insights: string[] = [];
  if (benchmarks.qualityPercentile != null && benchmarks.qualityPercentile >= 90) {
    insights.push('Your quality score is in the top 10% of all workers.');
  }
  if (speedVsPeers != null && speedVsPeers > 0.1) {
    insights.push('You are completing tasks over 10% faster than peers.');
  }
  if (!insights.length && totalWorkerTasks > 0) {
    insights.push('Great consistency—keep the streak going this week!');
  }

  const summary: WorkerAnalyticsSnapshot = {
    tasksPerDayTotal: totalWorkerTasks,
    earningsTotal: workerDaily.reduce((sum, entry) => sum + entry.earnings, 0),
    averageQuality: workerQualityAverage,
    averageSecondsPerTask: workerSecondsPerTask,
    daysTracked: workerDaily.length,
  };

  const response: WorkerAnalyticsSummary = {
    tasksPerDay,
    qualityTrend,
    earningsPerDay,
    speedTrend,
    benchmarks,
    insights,
    summary,
  };

  analyticsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: response });

  return response;
}
