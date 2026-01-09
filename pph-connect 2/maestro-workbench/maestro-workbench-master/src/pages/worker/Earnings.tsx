import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { calculateWorkerBalance, getBalanceBreakdown } from '@/services/balanceService';
import { CircleDollarSign, TrendingUp, Layers, CalendarDays, RefreshCcw } from 'lucide-react';

const formatCurrencyValue = (amount: number, currency: string | null) => {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }
  return amount.toFixed(2);
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
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

type EarningsHistoryRow = {
  work_date: string;
  earnings: number | null;
  project_id: string | null;
  projects: {
    id: string;
    name: string | null;
    project_code: string | null;
  } | null;
};

export const WorkerEarningsPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<{ amount: number; currency: string | null }>({ amount: 0, currency: null });
  const [breakdown, setBreakdown] = useState<{ projectId: string | null; earnings: number; currency: string | null }[]>([]);
  const [history, setHistory] = useState<EarningsHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    if (!user?.id) {
      setSummary({ amount: 0, currency: null });
      setBreakdown([]);
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const { start, end } = getCurrentMonthRange();
      const [summaryResult, breakdownResult, historyResult] = await Promise.all([
        calculateWorkerBalance(user.id, start, end),
        getBalanceBreakdown(user.id, start, end),
        supabase
          .from('work_stats')
          .select('work_date, earnings, project_id, projects:projects(id, name, project_code)')
          .eq('worker_id', user.id)
          .gte('work_date', start)
          .lte('work_date', end)
          .order('work_date', { ascending: false })
          .limit(30)
      ]);

      setSummary({ amount: summaryResult.total, currency: summaryResult.currency });
      setBreakdown(breakdownResult.breakdown);

      if (historyResult.error) {
        throw historyResult.error;
      }
      setHistory((historyResult.data ?? []) as EarningsHistoryRow[]);
    } catch (error) {
      console.error('WorkerEarningsPage: failed to load earnings', error);
      toast.error('Unable to load earnings data');
      setBreakdown([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchEarnings().catch((error) => console.warn('WorkerEarningsPage: unexpected error', error));
  }, [fetchEarnings]);

  const totalProjects = useMemo(() => breakdown.length, [breakdown]);

  const handleRefreshEarnings = useCallback(() => {
    fetchEarnings().catch((error) => console.warn('WorkerEarningsPage: refresh error', error));
  }, [fetchEarnings]);

  return (
    <div className="bg-background min-h-screen" data-testid="worker-earnings-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-testid="worker-earnings-header">
          <div>
            <p className="text-sm text-muted-foreground">Payments overview</p>
            <h1 className="text-3xl font-bold">Earnings & payouts</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshEarnings} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card data-testid="worker-earnings-summary">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">This month</p>
                  <p className="text-3xl font-bold">
                    {loading ? 'Syncing…' : formatCurrencyValue(summary.amount, summary.currency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Projects</p>
                  <p className="text-3xl font-bold">{loading ? '—' : totalProjects}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Period</p>
                  <p>{formatDate(getCurrentMonthRange().start)} – {formatDate(getCurrentMonthRange().end)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="worker-earnings-breakdown">
          <CardHeader>
            <CardTitle>Project breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading project breakdown…</p>
            ) : breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No earnings recorded for this period.</p>
            ) : (
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <div key={item.projectId ?? 'unknown'} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.projectId ?? 'Unassigned project'}</p>
                      <p className="text-xs text-muted-foreground">Current payout</p>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrencyValue(item.earnings, item.currency ?? summary.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="worker-earnings-history">
          <CardHeader>
            <CardTitle>Earnings history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading earnings history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No work stats recorded for this time period.</p>
            ) : (
              <div className="space-y-2">
                {history.map((row) => (
                  <div key={`${row.project_id}-${row.work_date}`} className="rounded-lg border px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {row.projects?.name ?? 'Project'} {row.projects?.project_code ? `(${row.projects.project_code})` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(row.work_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrencyValue(Number(row.earnings ?? 0), summary.currency)}
                      </p>
                      <Badge variant="outline">{row.projects?.project_code ?? row.project_id ?? 'N/A'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Work stats refresh automatically via Supabase; values reflect posted amounts only.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerEarningsPage;
