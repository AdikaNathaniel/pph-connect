import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkerAnalyticsSummary } from '@/integrations/supabase/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface WorkerAnalyticsSummaryProps {
  summary: WorkerAnalyticsSummary | null;
}

const formatTotalActiveTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatAverageHandleTime = (seconds: number | null) => {
  if (seconds == null || isNaN(seconds) || seconds <= 0) {
    return '–';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

export const WorkerAnalyticsSummaryCard: FC<WorkerAnalyticsSummaryProps> = ({ summary }) => {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No analytics available yet. Complete tasks to start building your stats.</p>
        </CardContent>
      </Card>
    );
  }

  const lastActive = summary.last_active_at
    ? formatDistanceToNow(parseISO(summary.last_active_at), { addSuffix: true })
    : 'No activity yet';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Performance Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Metric value={summary.total_completed_tasks} label="All-time tasks" />
          <Metric value={summary.tasks_today} label="Today" />
          <Metric value={summary.tasks_last_24h} label="Last 24h" />
          <Metric value={summary.distinct_projects} label="Projects contributed" />
          <Metric value={formatAverageHandleTime(summary.avg_aht_seconds)} label="Avg handling time" />
          <Metric value={formatTotalActiveTime(summary.total_active_seconds)} label="Total active time" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Last active {lastActive}</p>
      </CardContent>
    </Card>
  );
};

interface MetricProps {
  value: number | string;
  label: string;
}

const Metric: FC<MetricProps> = ({ value, label }) => {
  const displayValue = typeof value === 'number' && isNaN(value) ? 0 : value;
  
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-2xl font-semibold">{displayValue}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

export default WorkerAnalyticsSummaryCard;

