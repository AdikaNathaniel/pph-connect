import { supabase } from '@/integrations/supabase/client';

export type ReportMetric = 'tasks' | 'quality' | 'earnings' | 'hours';
export type ReportGroupBy = 'project' | 'worker' | 'day' | 'week' | 'month';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string | null;
  workerId?: string | null;
  metrics: ReportMetric[];
  groupBy: ReportGroupBy;
}

export interface ReportColumn {
  key: string;
  label: string;
  unit?: string;
}

export interface ReportRow {
  [key: string]: string | number | null;
}

export interface ReportChartData {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
}

export interface ReportSummary {
  totalTasks: number;
  totalEarnings: number;
  totalHours: number;
  averageQuality: number | null;
}

export interface ReportMetadata {
  projects: Array<{ id: string; name: string }>;
  workers: Array<{ id: string; name: string }>;
}

export type ReportResult = {
  columns: ReportColumn[];
  rows: ReportRow[];
  chart: ReportChartData;
  summary: ReportSummary;
  filters: ReportFilters;
  metadata: ReportMetadata;
};

export interface AvailableMetric {
  id: ReportMetric;
  label: string;
  unit: string;
  description: string;
}

const METRIC_META: Record<ReportMetric, AvailableMetric> = {
  tasks: { id: 'tasks', label: 'Tasks Completed', unit: 'tasks', description: 'Units completed in work stats' },
  quality: { id: 'quality', label: 'Quality Score', unit: '%', description: 'Average quality score' },
  earnings: { id: 'earnings', label: 'Earnings', unit: 'USD', description: 'Sum of reported earnings' },
  hours: { id: 'hours', label: 'Hours Worked', unit: 'hrs', description: 'Total hours worked' },
};

const defaultFilters: ReportFilters = {
  metrics: ['tasks', 'earnings', 'hours'],
  groupBy: 'project',
};

const toIsoDate = (date: string | undefined) => (date ? new Date(date).toISOString().slice(0, 10) : undefined);

const formatWeekLabel = (isoDate: string) => {
  const date = new Date(isoDate);
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((date.getDay() + 1 + days) / 7);
  return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
};

const formatMonthLabel = (isoDate: string) => isoDate.slice(0, 7);

const buildGroupLabel = (
  groupBy: ReportGroupBy,
  row: {
    projectName?: string | null;
    workerName?: string | null;
    date?: string | null;
  }
) => {
  const fallback = 'Unassigned';
  switch (groupBy) {
    case 'project':
      return row.projectName ?? fallback;
    case 'worker':
      return row.workerName ?? fallback;
    case 'day':
      return row.date ?? 'Unknown day';
    case 'week':
      return row.date ? formatWeekLabel(row.date) : 'Unknown week';
    case 'month':
      return row.date ? formatMonthLabel(row.date) : 'Unknown month';
    default:
      return fallback;
  }
};

const clamp = (value: number) => (Number.isFinite(value) ? value : 0);

export async function getAvailableMetrics(): Promise<AvailableMetric[]> {
  return Object.values(METRIC_META);
}

export async function generateManagerReport(filterOverrides: Partial<ReportFilters>): Promise<ReportResult> {
  const filters: ReportFilters = {
    ...defaultFilters,
    ...filterOverrides,
    metrics: filterOverrides.metrics?.length ? filterOverrides.metrics : defaultFilters.metrics,
  };

  const startDate = toIsoDate(filters.startDate);
  const endDate = toIsoDate(filters.endDate);

  const workStatsQuery = supabase
    .from('work_stats')
    .select('work_date, units_completed, earnings, hours_worked, projects(project_name), workers(full_name), project_id, worker_id')
    .order('work_date', { ascending: true })
    .limit(5000);

  if (startDate) {
    workStatsQuery.gte('work_date', startDate);
  }
  if (endDate) {
    workStatsQuery.lte('work_date', endDate);
  }
  if (filters.projectId) {
    workStatsQuery.eq('project_id', filters.projectId);
  }
  if (filters.workerId) {
    workStatsQuery.eq('worker_id', filters.workerId);
  }

  const qualityQueryNeeded = filters.metrics.includes('quality');

  const qualityQuery = qualityQueryNeeded
    ? supabase
        .from('quality_metrics')
        .select('measured_at, metric_value, project_id, worker_id, projects(project_name), workers(full_name)')
        .eq('metric_type', 'quality')
        .order('measured_at', { ascending: true })
        .limit(5000)
    : null;

  if (qualityQuery && startDate) {
    qualityQuery.gte('measured_at', `${startDate}T00:00:00`);
  }
  if (qualityQuery && endDate) {
    qualityQuery.lte('measured_at', `${endDate}T23:59:59`);
  }
  if (qualityQuery && filters.projectId) {
    qualityQuery.eq('project_id', filters.projectId);
  }
  if (qualityQuery && filters.workerId) {
    qualityQuery.eq('worker_id', filters.workerId);
  }

  const [projectsResult, workersResult, workStatsResult, qualityMetricsResult] = await Promise.all([
    supabase.from('projects').select('id, project_name').limit(500).order('project_name', { ascending: true }),
    supabase.from('workers').select('id, full_name').limit(500).order('full_name', { ascending: true }),
    workStatsQuery,
    qualityQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  if (workStatsResult.error) {
    throw workStatsResult.error;
  }
  if (qualityQuery && qualityMetricsResult.error) {
    throw qualityMetricsResult.error;
  }

  if (projectsResult.error) {
    throw projectsResult.error;
  }
  if (workersResult.error) {
    throw workersResult.error;
  }

  const workStatsData = workStatsResult.data ?? [];
  const qualityData = (qualityMetricsResult.data as Array<{
    measured_at?: string | null;
    metric_value?: number | null;
    project_id?: string | null;
    worker_id?: string | null;
    projects?: { project_name?: string | null } | null;
    workers?: { full_name?: string | null } | null;
  }>) ?? [];

  const aggregates = new Map<
    string,
    {
      label: string;
      tasks: number;
      earnings: number;
      hours: number;
      qualityTotal: number;
      qualityCount: number;
    }
  >();

  const ensureAggregate = (label: string) => {
    if (!aggregates.has(label)) {
      aggregates.set(label, {
        label,
        tasks: 0,
        earnings: 0,
        hours: 0,
        qualityTotal: 0,
        qualityCount: 0,
      });
    }
    return aggregates.get(label)!;
  };

  workStatsData.forEach((row) => {
    const date = row.work_date ?? undefined;
    const label = buildGroupLabel(filters.groupBy, {
      projectName: row.projects?.project_name,
      workerName: row.workers?.full_name,
      date,
    });
    const aggregate = ensureAggregate(label);
    aggregate.tasks += clamp(Number(row.units_completed ?? 0));
    aggregate.earnings += clamp(Number(row.earnings ?? 0));
    aggregate.hours += clamp(Number(row.hours_worked ?? 0));
  });

  qualityData.forEach((row) => {
    const date = row.measured_at?.slice(0, 10);
    const label = buildGroupLabel(filters.groupBy, {
      projectName: row.projects?.project_name,
      workerName: row.workers?.full_name,
      date,
    });
    const aggregate = ensureAggregate(label);
    aggregate.qualityTotal += Number(row.metric_value ?? 0);
    aggregate.qualityCount += 1;
  });

  const labels = Array.from(aggregates.keys());

  const rows: ReportRow[] = labels.map((label) => {
    const aggregate = aggregates.get(label)!;
    return {
      label,
      tasks: Math.round(aggregate.tasks),
      earnings: Number(aggregate.earnings.toFixed(2)),
      hours: Number(aggregate.hours.toFixed(2)),
      quality:
        aggregate.qualityCount > 0
          ? Number((aggregate.qualityTotal / aggregate.qualityCount).toFixed(2))
          : null,
    };
  });

  const columns: ReportColumn[] = [
    { key: 'label', label: filters.groupBy.charAt(0).toUpperCase() + filters.groupBy.slice(1) },
  ];
  filters.metrics.forEach((metric) => {
    columns.push({ key: metric, label: METRIC_META[metric].label, unit: METRIC_META[metric].unit });
  });

  const chartMetric = filters.metrics[0];
  const chart: ReportChartData = {
    labels,
    series: [
      {
        name: METRIC_META[chartMetric].label,
        data: rows.map((row) => Number(row[chartMetric] ?? 0)),
      },
    ],
  };

  const summary: ReportSummary = {
    totalTasks: rows.reduce((sum, row) => sum + Number(row.tasks ?? 0), 0),
    totalEarnings: rows.reduce((sum, row) => sum + Number(row.earnings ?? 0), 0),
    totalHours: rows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0),
    averageQuality:
      rows.filter((row) => typeof row.quality === 'number').length > 0
        ? Number(
            (
              rows.reduce((sum, row) => sum + (typeof row.quality === 'number' ? (row.quality as number) : 0), 0) /
              rows.filter((row) => typeof row.quality === 'number').length
            ).toFixed(2)
          )
        : null,
  };

  return {
    columns,
    rows,
    chart,
    summary,
    filters,
    metadata: {
      projects: (projectsResult.data ?? []).map((project) => ({ id: project.id, name: project.project_name ?? 'Untitled project' })),
      workers: (workersResult.data ?? []).map((worker) => ({ id: worker.id, name: worker.full_name ?? 'Unknown worker' })),
    },
  };
}

export async function exportReportAsCsv(result: ReportResult): Promise<string> {
  const header = result.columns.map((column) => column.label).join(',');
  const lines = result.rows.map((row) =>
    result.columns
      .map((column) => {
        const value = row[column.key];
        if (value == null) return '';
        if (typeof value === 'number') return value.toString();
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
}
