import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  exportReportAsCsv,
  generateManagerReport,
  getAvailableMetrics,
  type ReportFilters,
  type ReportMetric,
} from '@/services/reportsService';
import { toast } from 'sonner';

const DEFAULT_FILTERS: Partial<ReportFilters> = {
  metrics: ['tasks', 'earnings', 'hours'],
  groupBy: 'project',
};

const metricOrder: ReportMetric[] = ['tasks', 'quality', 'earnings', 'hours'];

const groupOptions = [
  { id: 'project', label: 'Project' },
  { id: 'worker', label: 'Worker' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

interface ReportTemplate {
  id: string;
  name: string;
  filters: ReportFilters;
  createdAt: string;
}

const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    ...DEFAULT_FILTERS,
    metrics: DEFAULT_FILTERS.metrics as ReportMetric[],
    groupBy: DEFAULT_FILTERS.groupBy!,
    startDate: undefined,
    endDate: undefined,
    projectId: null,
    workerId: null,
  });
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<ReportTemplate[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('manager-report-templates');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ReportTemplate[];
      return parsed ?? [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('manager-report-templates', JSON.stringify(templates));
  }, [templates]);

  const metricsQuery = useQuery({
    queryKey: ['reports-metrics'],
    queryFn: getAvailableMetrics,
  });

  const reportQuery = useQuery({
    queryKey: ['manager-report', filters],
    queryFn: () => generateManagerReport(filters),
  });

  const exportCsv = useMutation({
    mutationFn: async () => {
      if (!reportQuery.data) throw new Error('No report data');
      const csv = await exportReportAsCsv(reportQuery.data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'manager-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Report exported as CSV');
    },
    onError: () => toast.error('Unable to export CSV'),
  });

  const exportPdf = () => {
    window.print();
  };

  const availableMetrics = metricsQuery.data ?? [];
  const selectedMetrics = useMemo(() => new Set(filters.metrics), [filters.metrics]);

  const toggleMetric = (metric: ReportMetric) => {
    setFilters((prev) => {
      const next = new Set(prev.metrics);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      if (next.size === 0) {
        toast.error('Select at least one metric');
        return prev;
      }
      return { ...prev, metrics: Array.from(next) as ReportMetric[] };
    });
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    reportQuery.refetch();
  };

  const report = reportQuery.data;

  const saveTemplate = () => {
    const trimmed = templateName.trim();
    if (!trimmed) {
      toast.error('Template name required');
      return;
    }
    const newTemplate: ReportTemplate = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`,
      name: trimmed,
      filters,
      createdAt: new Date().toISOString(),
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setTemplateName('');
    toast.success('Template saved');
  };

  const applyTemplate = (template: ReportTemplate) => {
    setFilters(template.filters);
    toast.success(`Applied template "${template.name}"`);
  };

  return (
    <div data-testid="manager-reports-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Custom Reports</h1>
          <p className="text-sm text-muted-foreground">
            Build downloadable reports across projects, workers, and time ranges.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="manager-reports-export-csv"
            variant="outline"
            size="sm"
            onClick={() => exportCsv.mutateAsync()}
            disabled={!report}
          >
            Export CSV
          </Button>
          <Button
            data-testid="manager-reports-export-pdf"
            variant="outline"
            size="sm"
            onClick={exportPdf}
            disabled={!report}
          >
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Builder</CardTitle>
          <CardDescription>Choose metrics, filters, and grouping.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            data-testid="manager-reports-builder-form"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            onSubmit={applyFilters}
          >
            <div className="space-y-2">
              <Label htmlFor="report-date-start">Start date</Label>
              <Input
                id="report-date-start"
                data-testid="manager-reports-date-start"
                type="date"
                value={filters.startDate ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-date-end">End date</Label>
              <Input
                id="report-date-end"
                data-testid="manager-reports-date-end"
                type="date"
                value={filters.endDate ?? ''}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Group by</Label>
              <Select
                value={filters.groupBy}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, groupBy: value as ReportFilters['groupBy'] }))}
              >
                <SelectTrigger data-testid="manager-reports-group-select">
                  <SelectValue placeholder="Select grouping" />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={filters.projectId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, projectId: value === 'all' ? null : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {report?.metadata.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Worker</Label>
              <Select
                value={filters.workerId ?? 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, workerId: value === 'all' ? null : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All workers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All workers</SelectItem>
                  {report?.metadata.workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2" data-testid="manager-reports-metric-select">
              <Label>Metrics</Label>
              <div className="grid gap-2">
                {metricOrder.map((metric) => {
                  const meta = availableMetrics.find((item) => item.id === metric);
                  if (!meta) return null;
                  const checked = selectedMetrics.has(metric);
                  return (
                    <label key={metric} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={() => toggleMetric(metric)} />
                      <span>{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Save and reuse common report configurations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row" data-testid="manager-reports-save-template">
            <Input
              placeholder="Template name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
            <Button type="button" onClick={saveTemplate} variant="secondary">
              Save template
            </Button>
          </div>
          <div data-testid="manager-reports-template-list">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet. Save your current filters for reuse.</p>
            ) : (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li key={template.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Grouped by {template.filters.groupBy} · Metrics: {template.filters.metrics.join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => applyTemplate(template)}>
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setTemplates((prev) => prev.filter((item) => item.id !== template.id))}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Roll-up of selected metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {report ? (
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt>Total tasks</dt>
                  <dd className="font-medium">{report.summary.totalTasks.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Total earnings</dt>
                  <dd className="font-medium">${report.summary.totalEarnings.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Total hours</dt>
                  <dd className="font-medium">{report.summary.totalHours.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Avg quality</dt>
                  <dd className="font-medium">
                    {report.summary.averageQuality != null ? `${report.summary.averageQuality}%` : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Load a report to see summary stats.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2" data-testid="manager-reports-chart">
          <CardHeader>
            <CardTitle>Chart preview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {report ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.chart.labels.map((label, index) => ({
                  label,
                  value: report.chart.series[0]?.data[index] ?? 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Generate a report to visualize trends.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Table view of the current report.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table data-testid="manager-reports-results-table" className="w-full text-sm">
            <thead>
              <tr>
                {report?.columns.map((column) => (
                  <th key={column.key} className="border-b py-2 text-left font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report?.rows.map((row) => (
                <tr key={row.label as string} className="border-b last:border-0">
                  {report.columns.map((column) => (
                    <td key={column.key} className="py-2">
                      {row[column.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    {reportQuery.isLoading ? 'Loading report…' : 'No results yet. Apply filters to generate a report.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
