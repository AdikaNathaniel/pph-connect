import { supabase } from '@/integrations/supabase/client';

type WorkStatsRow = {
  project_id: string | null;
  earnings: number | null;
  currency: string | null;
};

export type BalanceSummary = {
  total: number;
  currency: string | null;
};

export type BalanceBreakdownItem = {
  projectId: string | null;
  earnings: number;
  currency: string | null;
};

export interface BalanceBreakdown {
  total: BalanceSummary;
  breakdown: BalanceBreakdownItem[];
}

const normalizeNumber = (value: number | null) =>
  Number.isFinite(value) ? Number(value) : 0;

export const calculateWorkerBalance = async (
  workerId: string,
  startDate: string,
  endDate: string
): Promise<BalanceSummary> => {
  // sum('earnings') computed manually to support multiple currencies
  const { data, error } = await supabase
    .from('work_stats')
    .select('sum_earnings:earnings.sum(), currency')
    .eq('worker_id', workerId)
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as { sum_earnings: number | null; currency: string | null }[];
  const total = normalizeNumber(rows[0]?.sum_earnings ?? 0);
  const currency = rows.find((row) => row.currency)?.currency ?? null;

  return {
    total,
    currency
  };
};

const groupByProject = (rows: WorkStatsRow[]) => {
  const map = new Map<string | null, { earnings: number; currency: string | null }>();
  rows.forEach((row) => {
    const key = row.project_id ?? null;
    const entry = map.get(key) ?? { earnings: 0, currency: row.currency ?? null };
    entry.earnings += normalizeNumber(row.earnings);
    if (!entry.currency && row.currency) {
      entry.currency = row.currency;
    }
    map.set(key, entry);
  });
  return map;
};

export const getBalanceBreakdown = async (
  workerId: string,
  startDate: string,
  endDate: string
): Promise<BalanceBreakdown> => {
  const { data, error } = await supabase
    .from('work_stats')
    .select('project_id, earnings, currency')
    .eq('worker_id', workerId)
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as WorkStatsRow[];
  if (rows.length === 0) {
    // return { total: 0 } fallback structure
    return {
      total: {
        total: 0,
        currency: null
      },
      breakdown: []
    };
  }
  const grouped = groupByProject(rows);
  const breakdown: BalanceBreakdownItem[] = Array.from(grouped.entries()).map(([projectId, info]) => ({
    projectId,
    earnings: info.earnings,
    currency: info.currency
  }));

  const totalsByCurrency = rows.reduce((map, row) => {
    const key = row.currency ?? 'UNKNOWN';
    const current = map.get(key) ?? 0;
    return map.set(key, current + normalizeNumber(row.earnings));
  }, new Map<string, number>());

  let currency: string | null = null;
  let total = 0;
  if (totalsByCurrency.size > 0) {
    const [key, value] = Array.from(totalsByCurrency.entries()).sort((a, b) => b[1] - a[1])[0];
    currency = key === 'UNKNOWN' ? null : key;
    total = value;
  }

  return {
    total: {
      total,
      currency
    },
    breakdown
  };
};

export default {
  calculateWorkerBalance,
  getBalanceBreakdown
};
