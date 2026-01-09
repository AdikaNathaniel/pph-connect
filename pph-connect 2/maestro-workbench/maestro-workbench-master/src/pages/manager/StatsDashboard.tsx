import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  delta?: string;
};

type EarningsPoint = {
  date: string;
  earnings: number;
};

type ProjectBreakdown = {
  project: string;
  units: number;
};

type TopEarner = {
  worker: string;
  earnings: number;
  units: number;
};

const SAMPLE_SUMMARY: SummaryMetric[] = [
  { id: 'earnings', label: 'Total earnings (7d)', value: '$128,450', delta: '+6.2%' },
  { id: 'units', label: 'Units completed', value: '52,310', delta: '+2.8%' },
  { id: 'hours', label: 'Hours worked', value: '14,920', delta: '+4.5%' },
  { id: 'workers', label: 'Active workers', value: '312', delta: '+3.1%' }
];

const SAMPLE_EARNINGS: EarningsPoint[] = [
  { date: '2025-11-04', earnings: 15400 },
  { date: '2025-11-05', earnings: 16350 },
  { date: '2025-11-06', earnings: 17120 },
  { date: '2025-11-07', earnings: 16980 },
  { date: '2025-11-08', earnings: 17650 },
  { date: '2025-11-09', earnings: 18040 },
  { date: '2025-11-10', earnings: 19130 }
];

const SAMPLE_PROJECT_BREAKDOWN: ProjectBreakdown[] = [
  { project: 'Atlas', units: 18200 },
  { project: 'Beacon', units: 14310 },
  { project: 'Comet', units: 11280 },
  { project: 'Delta', units: 9050 }
];

const SAMPLE_TOP_EARNERS: TopEarner[] = [
  { worker: 'Ava Cole', earnings: 3280, units: 1420 },
  { worker: 'Liam Patel', earnings: 2960, units: 1310 },
  { worker: 'Noah Santos', earnings: 2840, units: 1240 },
  { worker: 'Sophia Lin', earnings: 2710, units: 1185 },
  { worker: 'Ethan Ruiz', earnings: 2640, units: 1125 }
];

export const StatsDashboard: React.FC = () => {
  const totalUnits = useMemo(
    () => SAMPLE_PROJECT_BREAKDOWN.reduce((sum, row) => sum + row.units, 0),
    []
  );

  return (
    <div data-testid="stats-dashboard" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SAMPLE_SUMMARY.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              {metric.delta ? (
                <p className="text-xs text-emerald-600">{metric.delta} vs previous period</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Earnings over time</CardTitle>
          </CardHeader>
          <CardContent data-testid="stats-dashboard-earnings-chart" className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              Line chart placeholder
            </div>
            <p>Daily earnings totals across the selected period.</p>
            <ul className="flex flex-wrap gap-4 text-xs">
              {SAMPLE_EARNINGS.map((point) => (
                <li key={point.date} className="flex items-center gap-2">
                  <Badge variant="outline">{point.date}</Badge>
                  <span>${point.earnings.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Units by project</CardTitle>
          </CardHeader>
          <CardContent data-testid="stats-dashboard-project-chart" className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
              Bar chart placeholder
            </div>
            <ul className="space-y-2 text-sm">
              {SAMPLE_PROJECT_BREAKDOWN.map((row) => (
                <li key={row.project} className="flex items-center justify-between">
                  <span>{row.project}</span>
                  <span className="font-medium">{row.units.toLocaleString()} units</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground">
              {totalUnits.toLocaleString()} total units across active projects
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top earners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="stats-dashboard-top-earners">
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead className="text-right">Units</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_TOP_EARNERS.map((row) => (
                <TableRow key={row.worker}>
                  <TableCell>{row.worker}</TableCell>
                  <TableCell className="text-right font-medium">${row.earnings.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.units.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsDashboard;
