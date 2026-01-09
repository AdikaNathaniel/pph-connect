import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AutoRemovalRow = Database['public']['Tables']['auto_removals']['Row'];

export interface RemovalAuditEntry {
  id: string;
  workerId: string;
  projectId: string;
  removalReason: string;
  removedAt: string;
  appealStatus: AutoRemovalRow['appeal_status'];
  canAppeal: boolean;
  appealMessage?: string | null;
  appealSubmittedAt?: string | null;
  appealDecisionAt?: string | null;
  appealDecisionNotes?: string | null;
  metricsSnapshot?: Record<string, unknown> | null;
}

export interface RemovalMetricSummary {
  totalRemovals: number;
  removalRate: number;
  appealRate: number;
  reinstatementRate: number;
  trend: Array<{ label: string; count: number }>;
}

const LOOKBACK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toRemovalEntry = (row: AutoRemovalRow): RemovalAuditEntry => ({
  id: row.id,
  workerId: row.worker_id,
  projectId: row.project_id,
  removalReason: row.removal_reason,
  removedAt: row.removed_at,
  appealStatus: row.appeal_status ?? 'pending',
  canAppeal: Boolean(row.can_appeal),
  appealMessage: row.appeal_message,
  appealSubmittedAt: row.appeal_submitted_at,
  appealDecisionAt: row.appeal_decision_at,
  appealDecisionNotes: row.appeal_decision_notes,
  metricsSnapshot: (row.metrics_snapshot as Record<string, unknown> | null) ?? null,
});

const getWeekLabel = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const weekStart = new Date(date.setDate(diff));
  const month = weekStart.toLocaleString(undefined, { month: 'short' });
  const dayOfMonth = weekStart.getDate();
  return `${month} ${dayOfMonth}`;
};

const clampPercent = (value: number) => Math.round(Math.max(0, value) * 100) / 100;

export async function fetchRemovalAudits(): Promise<RemovalAuditEntry[]> {
  const lookbackStart = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString();

  const { data, error } = await supabase
    .from('auto_removals')
    .select(
      `
        id,
        worker_id,
        project_id,
        removal_reason,
        metrics_snapshot,
        removed_at,
        appeal_status,
        can_appeal,
        appeal_message,
        appeal_submitted_at,
        appeal_decision_at,
        appeal_decision_notes
      `
    )
    .gte('removed_at', lookbackStart)
    .order('removed_at', { ascending: false });

  if (error) {
    console.warn('removalAuditService: failed to load auto removals', error);
    return [];
  }

  return (data ?? []).map((row) => toRemovalEntry(row as AutoRemovalRow));
}

export async function fetchRemovalMetrics(): Promise<RemovalMetricSummary> {
  const lookbackStart = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString();

  const { data, error } = await supabase
    .from('auto_removals')
    .select('id, removed_at, appeal_status, appeal_submitted_at, appeal_message')
    .gte('removed_at', lookbackStart);

  if (error) {
    console.warn('removalAuditService: failed to compute metrics', error);
    return {
      totalRemovals: 0,
      removalRate: 0,
      appealRate: 0,
      reinstatementRate: 0,
      trend: [],
    };
  }

  const rows = (data ?? []) as Array<Pick<AutoRemovalRow, 'id' | 'removed_at' | 'appeal_status' | 'appeal_submitted_at' | 'appeal_message'>>;
  const totalRemovals = rows.length;
  const appealed = rows.filter((row) => Boolean(row.appeal_message) || Boolean(row.appeal_submitted_at));
  const reinstated = rows.filter((row) => row.appeal_status === 'approved');

  const trendMap = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.removed_at) {
      return;
    }
    const label = getWeekLabel(row.removed_at);
    trendMap.set(label, (trendMap.get(label) ?? 0) + 1);
  });

  const trend = Array.from(trendMap.entries()).map(([label, count]) => ({ label, count }));

  const removalRate = clampPercent(totalRemovals / LOOKBACK_DAYS);
  const appealRate = totalRemovals ? clampPercent(appealed.length / totalRemovals) : 0;
  const reinstatementRate = appealed.length ? clampPercent(reinstated.length / appealed.length) : 0;

  return {
    totalRemovals,
    removalRate,
    appealRate,
    reinstatementRate,
    trend,
  };
}
