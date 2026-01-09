import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  calculateWorkerQualityScore,
  getGoldStandardAccuracy,
  getInterAnnotatorAgreementByProject,
  updateWorkerTrustRating,
} from '@/services/qualityService';

type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  trend?: string;
  testId: string;
};

type TrendPoint = {
  date: string;
  score: number;
};

type DistributionBucket = {
  label: string;
  workers: number;
};

type ProjectQualitySnapshot = {
  project: string;
  score: number;
  goldPassRate: string;
};

type TrustRow = {
  worker: string;
  project: string;
  trust: number;
  delta: string;
};

const QUALITY_SUMMARY: SummaryMetric[] = [
  {
    id: 'overall',
    label: 'Overall project quality',
    value: '92.4',
    helper: 'Aggregate quality score across all active projects',
    trend: '+1.2 vs last week',
    testId: 'quality-overall-score',
  },
  {
    id: 'gold-rate',
    label: 'Gold standard pass rate',
    value: '96.1%',
    helper: 'Rolling 7-day accuracy for seeded tasks',
    trend: '+0.4 week-over-week',
    testId: 'quality-pass-rate',
  },
  {
    id: 'iaa',
    label: 'Inter-annotator agreement',
    value: '0.88',
    helper: 'Krippendorff alpha across overlapping work',
    trend: '+0.03 week-over-week',
    testId: 'quality-iaa',
  },
  {
    id: 'trust',
    label: 'Average trust rating',
    value: '87',
    helper: 'Mean worker trust score (0-100)',
    trend: '+2 pts vs last refresh',
    testId: 'quality-trust-ratings',
  },
];

const QUALITY_TRENDS: TrendPoint[] = [
  { date: 'Nov 3', score: 88 },
  { date: 'Nov 4', score: 89 },
  { date: 'Nov 5', score: 90 },
  { date: 'Nov 6', score: 91 },
  { date: 'Nov 7', score: 91.5 },
  { date: 'Nov 8', score: 92 },
  { date: 'Nov 9', score: 92.4 },
];

const QUALITY_DISTRIBUTION: DistributionBucket[] = [
  { label: 'Trust 95-100', workers: 42 },
  { label: 'Trust 85-95', workers: 118 },
  { label: 'Trust 70-85', workers: 86 },
  { label: 'Trust <70', workers: 24 },
];

const PROJECT_QUALITY: ProjectQualitySnapshot[] = [
  { project: 'Atlas', score: 94, goldPassRate: '98.2%' },
  { project: 'Beacon', score: 91, goldPassRate: '95.4%' },
  { project: 'Comet', score: 89, goldPassRate: '93.1%' },
  { project: 'Delta', score: 86, goldPassRate: '90.7%' },
];

const TRUST_ROWS: TrustRow[] = [
  { worker: 'Ava Cole', project: 'Atlas', trust: 98, delta: '+2.3' },
  { worker: 'Liam Patel', project: 'Beacon', trust: 94, delta: '+1.0' },
  { worker: 'Sophia Lin', project: 'Comet', trust: 88, delta: '+0.4' },
  { worker: 'Ethan Ruiz', project: 'Delta', trust: 82, delta: '-0.8' },
  { worker: 'Noah Santos', project: 'Delta', trust: 78, delta: '-1.5' },
];

const DEMO_WORKER_ID = '00000000-0000-0000-0000-000000000042';
const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000999';

export const QualityDashboard: React.FC = () => {
  const [summary, setSummary] = useState(QUALITY_SUMMARY);
  const [loading, setLoading] = useState(false);

  const refreshRealtimeMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [composite, goldAccuracy, iaa] = await Promise.all([
        calculateWorkerQualityScore(DEMO_WORKER_ID, DEMO_PROJECT_ID),
        getGoldStandardAccuracy(DEMO_WORKER_ID, DEMO_PROJECT_ID),
        getInterAnnotatorAgreementByProject(DEMO_PROJECT_ID),
      ]);
      const trust = await updateWorkerTrustRating(DEMO_WORKER_ID, DEMO_PROJECT_ID);

      setSummary((current) =>
        current.map((metric) => {
          if (metric.id === 'overall' && composite?.compositeScore != null) {
            return { ...metric, value: composite.compositeScore.toFixed(1) };
          }
          if (metric.id === 'gold-rate' && goldAccuracy != null) {
            return { ...metric, value: `${(goldAccuracy * 100).toFixed(1)}%` };
          }
          if (metric.id === 'iaa' && iaa != null) {
            return { ...metric, value: iaa.toFixed(2) };
          }
          if (metric.id === 'trust' && trust != null) {
            return { ...metric, value: trust.toFixed(0) };
          }
          return metric;
        })
      );
    } catch (error) {
      console.warn('QualityDashboard: failed to refresh metrics', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRealtimeMetrics();
    const intervalId = setInterval(refreshRealtimeMetrics, 30000);
    return () => clearInterval(intervalId);
  }, [refreshRealtimeMetrics]);

  const totalWorkers = useMemo(
    () => QUALITY_DISTRIBUTION.reduce((sum, bucket) => sum + bucket.workers, 0),
    []
  );

  return (
    <div data-testid="quality-dashboard" className="space-y-6">
      <section data-testid="quality-metrics-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((metric) => (
          <Card key={metric.id} data-testid={metric.testId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                {metric.label}
                {loading && <span className="text-[10px] uppercase tracking-wide text-primary">Syncing</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold">{metric.value}</div>
              {metric.trend ? <p className="text-xs text-emerald-600">{metric.trend}</p> : null}
              {metric.helper ? <p className="text-xs text-muted-foreground">{metric.helper}</p> : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quality trend (14d)</CardTitle>
          </CardHeader>
          <CardContent data-testid="quality-trend-chart" className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              Line chart placeholder
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {QUALITY_TRENDS.map((point) => (
                <Badge key={point.date} variant="outline">
                  {point.date}: {point.score.toFixed(1)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust distribution</CardTitle>
          </CardHeader>
          <CardContent data-testid="quality-distribution-chart" className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              Histogram placeholder
            </div>
            <ul className="space-y-2 text-sm">
              {QUALITY_DISTRIBUTION.map((bucket) => (
                <li key={bucket.label} className="flex items-center justify-between">
                  <span>{bucket.label}</span>
                  <span className="font-medium">{bucket.workers} workers</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground">{totalWorkers} workers with recorded trust ratings</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project quality comparison</CardTitle>
          </CardHeader>
          <CardContent data-testid="quality-project-compare-chart" className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              Bar chart placeholder
            </div>
            <ul className="space-y-2 text-sm">
              {PROJECT_QUALITY.map((snapshot) => (
                <li key={snapshot.project} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{snapshot.project}</span>
                    <span className="text-xs text-muted-foreground">Gold pass rate {snapshot.goldPassRate}</span>
                  </div>
                  <Badge variant="secondary">{snapshot.score}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust rating leaderboard</CardTitle>
          </CardHeader>
          <CardContent data-testid="quality-trust-table" className="space-y-3 text-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Trust</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRUST_ROWS.map((row) => (
                  <TableRow key={`${row.worker}-${row.project}`}>
                    <TableCell>
                      <div className="font-medium">{row.worker}</div>
                      <div className="text-xs text-muted-foreground">{row.delta} pts</div>
                    </TableCell>
                    <TableCell>{row.project}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold">{row.trust}</span>
                        <Progress value={row.trust} className="w-20" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QualityDashboard;
