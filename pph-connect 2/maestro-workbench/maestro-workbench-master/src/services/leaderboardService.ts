import { supabase } from '@/integrations/supabase/client';

const LEADERBOARD_LIMIT = 10;
const MAX_SOURCE_ROWS = 1000;

interface WorkerProfileSummary {
  id: string;
  full_name: string | null;
  hr_id: string | null;
  locale_primary: string | null;
}

export interface LeaderboardEntry {
  workerId: string;
  fullName: string;
  hrId: string | null;
  locale: string | null;
  value: number;
  unit: 'currency' | 'percentage' | 'tasks' | 'seconds';
}

type EarnerRow = {
  worker_id: string | null;
  earnings: number | null;
  workers: WorkerProfileSummary | null;
};

type ThroughputRow = {
  worker_id: string | null;
  units_completed: number | null;
  workers: WorkerProfileSummary | null;
};

type SpeedRow = {
  worker_id: string | null;
  units_completed: number | null;
  hours_worked: number | null;
  workers: WorkerProfileSummary | null;
};

type QualityRow = {
  worker_id: string | null;
  metric_value: number | null;
  measured_at: string | null;
  workers: WorkerProfileSummary | null;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const formatFullName = (worker: WorkerProfileSummary | null | undefined) => {
  if (!worker) {
    return 'Worker';
  }
  if (worker.full_name && worker.full_name.trim().length > 0) {
    return worker.full_name.trim();
  }
  return worker.hr_id ?? worker.id ?? 'Worker';
};

export async function getTopEarnersLeaderboard(limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  const { start, end } = getCurrentMonthRange();
  const { data, error } = await supabase
    .from('work_stats')
    .select('worker_id, earnings, workers:workers(id, full_name, hr_id, locale_primary)')
    .gte('work_date', start)
    .lte('work_date', end)
    .limit(MAX_SOURCE_ROWS);

  if (error) {
    console.warn('leaderboardService: failed to load work_stats', error);
    return [];
  }

  const totals = new Map<
    string,
    {
      worker: WorkerProfileSummary;
      value: number;
    }
  >();

  (data as EarnerRow[] | null)?.forEach((row) => {
    if (!row.worker_id || !row.workers) return;
    const current = totals.get(row.worker_id) ?? { worker: row.workers, value: 0 };
    current.value += Number.isFinite(row.earnings) ? Number(row.earnings) : 0;
    totals.set(row.worker_id, current);
  });

  return Array.from(totals.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, limit)
    .map(([workerId, payload]) => ({
      workerId,
      fullName: formatFullName(payload.worker),
      hrId: payload.worker.hr_id ?? null,
      locale: payload.worker.locale_primary ?? null,
      value: payload.value,
      unit: 'currency' as const,
    }));
}

export async function getTopQualityLeaderboard(limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('quality_metrics')
    .select('worker_id, metric_value, measured_at, workers:workers(id, full_name, hr_id, locale_primary)')
    .eq('metric_type', 'quality')
    .order('metric_value', { ascending: false })
    .order('measured_at', { ascending: false })
    .limit(MAX_SOURCE_ROWS);

  if (error) {
    console.warn('leaderboardService: failed to load quality metrics', error);
    return [];
  }

  const unique = new Map<
    string,
    {
      worker: WorkerProfileSummary;
      value: number;
    }
  >();

  (data as QualityRow[] | null)?.forEach((row) => {
    if (!row.worker_id || !row.workers) return;
    if (unique.has(row.worker_id)) {
      return;
    }
    const value = Number(row.metric_value);
    unique.set(row.worker_id, {
      worker: row.workers,
      value: Number.isFinite(value) ? value : 0,
    });
  });

  return Array.from(unique.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, limit)
    .map(([workerId, payload]) => ({
      workerId,
      fullName: formatFullName(payload.worker),
      hrId: payload.worker.hr_id ?? null,
      locale: payload.worker.locale_primary ?? null,
      value: payload.value,
      unit: 'percentage' as const,
    }));
}

export async function getMostProductiveLeaderboard(limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  const { start, end } = getCurrentMonthRange();
  const { data, error } = await supabase
    .from('work_stats')
    .select('worker_id, units_completed, workers:workers(id, full_name, hr_id, locale_primary)')
    .gte('work_date', start)
    .lte('work_date', end)
    .limit(MAX_SOURCE_ROWS);

  if (error) {
    console.warn('leaderboardService: failed to load throughput stats', error);
    return [];
  }

  const totals = new Map<
    string,
    {
      worker: WorkerProfileSummary;
      value: number;
    }
  >();

  (data as ThroughputRow[] | null)?.forEach((row) => {
    if (!row.worker_id || !row.workers) return;
    const current = totals.get(row.worker_id) ?? { worker: row.workers, value: 0 };
    current.value += Number.isFinite(row.units_completed) ? Number(row.units_completed) : 0;
    totals.set(row.worker_id, current);
  });

  return Array.from(totals.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, limit)
    .map(([workerId, payload]) => ({
      workerId,
      fullName: formatFullName(payload.worker),
      hrId: payload.worker.hr_id ?? null,
      locale: payload.worker.locale_primary ?? null,
      value: payload.value,
      unit: 'tasks' as const,
    }));
}

export async function getFastestCompletionLeaderboard(limit = LEADERBOARD_LIMIT): Promise<LeaderboardEntry[]> {
  const { start, end } = getCurrentMonthRange();
  const { data, error } = await supabase
    .from('work_stats')
    .select('worker_id, units_completed, hours_worked, workers:workers(id, full_name, hr_id, locale_primary)')
    .gte('work_date', start)
    .lte('work_date', end)
    .limit(MAX_SOURCE_ROWS);

  if (error) {
    console.warn('leaderboardService: failed to load completion speed stats', error);
    return [];
  }

  const aggregates = new Map<
    string,
    {
      worker: WorkerProfileSummary;
      units: number;
      hours: number;
    }
  >();

  (data as SpeedRow[] | null)?.forEach((row) => {
    if (!row.worker_id || !row.workers) return;
    const current = aggregates.get(row.worker_id) ?? { worker: row.workers, units: 0, hours: 0 };
    current.units += Number.isFinite(row.units_completed) ? Number(row.units_completed) : 0;
    current.hours += Number.isFinite(row.hours_worked) ? Number(row.hours_worked) : 0;
    aggregates.set(row.worker_id, current);
  });

  return Array.from(aggregates.entries())
    .map(([workerId, payload]) => {
      const averageSeconds =
        payload.units > 0 ? (payload.hours * 3600) / payload.units : Number.POSITIVE_INFINITY;
      return {
        workerId,
        fullName: formatFullName(payload.worker),
        hrId: payload.worker.hr_id ?? null,
        locale: payload.worker.locale_primary ?? null,
        value: averageSeconds,
        unit: 'seconds' as const,
      };
    })
    .filter((entry) => Number.isFinite(entry.value))
    .sort((a, b) => a.value - b.value)
    .slice(0, limit);
}
