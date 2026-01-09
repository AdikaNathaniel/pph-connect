import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert, ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchRemovalAudits, fetchRemovalMetrics, type RemovalAuditEntry } from '@/services/removalAuditService';

const statusLabels: Record<RemovalAuditEntry['appealStatus'], string> = {
  pending: 'Pending',
  approved: 'Reinstated',
  denied: 'Denied',
};

const statusVariant: Record<RemovalAuditEntry['appealStatus'], 'default' | 'outline' | 'destructive'> = {
  pending: 'outline',
  approved: 'default',
  denied: 'destructive',
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const AdminAutoRemovalsPage: React.FC = () => {
  const metricsQuery = useQuery({
    queryKey: ['removal-metrics'],
    queryFn: fetchRemovalMetrics,
  });

  const auditsQuery = useQuery({
    queryKey: ['removal-audits'],
    queryFn: fetchRemovalAudits,
  });

  const isLoading = metricsQuery.isLoading || auditsQuery.isLoading;

  if (isLoading) {
    return (
      <div
        data-testid="admin-auto-removals-page"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading removal audit dashboard…
      </div>
    );
  }

  const metrics = metricsQuery.data ?? {
    totalRemovals: 0,
    removalRate: 0,
    appealRate: 0,
    reinstatementRate: 0,
    trend: [],
  };

  const audits = auditsQuery.data ?? [];

  return (
    <div data-testid="admin-auto-removals-page" className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Removal Audit</h1>
        <p className="text-sm text-muted-foreground">
          Monitor automated removals, appeals, and reinstatements to spot systemic issues early.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="removal-metric-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Removals (30d)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRemovals}</div>
            <p className="text-xs text-muted-foreground">
              Avg {metrics.removalRate.toFixed(2)} removals per day
            </p>
          </CardContent>
        </Card>

        <Card data-testid="removal-metric-appeal">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appeal Rate</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.appealRate)}</div>
            <CardDescription>Share of removals escalated by workers</CardDescription>
          </CardContent>
        </Card>

        <Card data-testid="removal-metric-reinstatement">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reinstatement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(metrics.reinstatementRate)}</div>
            <CardDescription>Percent of appeals approved</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="removal-trend-chart">
        <CardHeader>
          <CardTitle>Weekly Trend</CardTitle>
          <CardDescription>Volume of removals grouped by week start</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {metrics.trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No removals recorded in this period.</p>
          ) : (
            metrics.trend.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="w-24 text-sm text-muted-foreground">{label}</span>
                <div className="flex-1 rounded-full bg-muted">
                  <div
                    className="rounded-full bg-primary py-1 text-xs text-primary-foreground"
                    style={{ width: `${Math.min(100, count * 10)}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Removals</CardTitle>
          <CardDescription>Last 30 days of automated removals and appeal outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <div data-testid="removal-audit-table" className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Removed</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Appeal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No entries for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.workerId}</TableCell>
                      <TableCell>{audit.projectId}</TableCell>
                      <TableCell>{new Date(audit.removedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{audit.removalReason}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[audit.appealStatus]}>
                          {statusLabels[audit.appealStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                        {audit.appealMessage ? audit.appealMessage : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAutoRemovalsPage;
