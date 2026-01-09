import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatsImportModal from '@/components/stats/StatsImportModal';
import runStatsImport from '@/lib/stats/etl';
import StatsDashboard from './StatsDashboard';

type FilterState = {
  dateStart: string;
  dateEnd: string;
  project: string;
  worker: string;
};

type HistoryRow = {
  id: string;
  reportDate: string;
  projectId: string;
  projectName: string;
  workerId: string;
  workerName: string;
  unitsCompleted: number;
  hoursWorked: number;
  status: 'imported' | 'validated' | 'in-review';
};

const SAMPLE_PROJECTS = [
  { id: 'all', name: 'All projects' },
  { id: 'atlas', name: 'Project Atlas' },
  { id: 'beacon', name: 'Project Beacon' },
  { id: 'comet', name: 'Project Comet' }
];

const SAMPLE_WORKERS = [
  { id: 'all', name: 'All workers' },
  { id: 'w-1', name: 'Ava Cole' },
  { id: 'w-2', name: 'Liam Patel' },
  { id: 'w-3', name: 'Noah Santos' }
];

const SAMPLE_HISTORY: HistoryRow[] = [
  {
    id: 'run-001',
    reportDate: '2025-11-10',
    projectId: 'atlas',
    projectName: 'Project Atlas',
    workerId: 'w-1',
    workerName: 'Ava Cole',
    unitsCompleted: 1240,
    hoursWorked: 345.5,
    status: 'imported'
  },
  {
    id: 'run-002',
    reportDate: '2025-11-09',
    projectId: 'beacon',
    projectName: 'Project Beacon',
    workerId: 'w-2',
    workerName: 'Liam Patel',
    unitsCompleted: 980,
    hoursWorked: 287,
    status: 'validated'
  },
  {
    id: 'run-003',
    reportDate: '2025-11-09',
    projectId: 'atlas',
    projectName: 'Project Atlas',
    workerId: 'w-3',
    workerName: 'Noah Santos',
    unitsCompleted: 1120,
    hoursWorked: 301.75,
    status: 'in-review'
  }
];

const statusToVariant: Record<HistoryRow['status'], 'secondary' | 'default' | 'outline'> = {
  imported: 'secondary',
  validated: 'default',
  'in-review': 'outline'
};

export const StatsPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateStart: '',
    dateEnd: '',
    project: 'all',
    worker: 'all'
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filteredHistory = useMemo(() => {
    return SAMPLE_HISTORY.filter((row) => {
      const matchesProject = filters.project === 'all' || row.projectId === filters.project;
      const matchesWorker = filters.worker === 'all' || row.workerId === filters.worker;

      const withinStart =
        filters.dateStart.length === 0 || row.reportDate >= filters.dateStart;
      const withinEnd =
        filters.dateEnd.length === 0 || row.reportDate <= filters.dateEnd;

      return matchesProject && matchesWorker && withinStart && withinEnd;
    });
  }, [filters]);

  const handleFilterChange = (patch: Partial<FilterState>) => {
    setFilters((previous) => ({
      ...previous,
      ...patch
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateStart: '',
      dateEnd: '',
      project: 'all',
      worker: 'all'
    });
  };

  return (
    <div data-testid="stats-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Review imported production stats and spot anomalies before dashboards refresh.
          </p>
        </div>
        <Button data-testid="stats-import-button" onClick={() => setImportDialogOpen(true)}>
          Import Stats
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            data-testid="stats-filter-form"
            className="grid gap-4 md:grid-cols-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="space-y-2">
              <Label htmlFor="stats-date-start">Start date</Label>
              <Input
                id="stats-date-start"
                type="date"
                name="dateStart"
                value={filters.dateStart}
                onChange={(event) => handleFilterChange({ dateStart: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stats-date-end">End date</Label>
              <Input
                id="stats-date-end"
                type="date"
                name="dateEnd"
                value={filters.dateEnd}
                onChange={(event) => handleFilterChange({ dateEnd: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={filters.project}
                onValueChange={(value) => handleFilterChange({ project: value })}
              >
                <SelectTrigger data-testid="stats-project-filter">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_PROJECTS.map((project) => (
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
                value={filters.worker}
                onValueChange={(value) => handleFilterChange({ worker: value })}
              >
                <SelectTrigger data-testid="stats-worker-filter">
                  <SelectValue placeholder="All workers" />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_WORKERS.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing {filteredHistory.length} of {SAMPLE_HISTORY.length} imports
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
              <Button size="sm" onClick={() => setImportDialogOpen(true)}>
                View import history
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stats history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="stats-history-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Worker</TableHead>
                <TableHead className="text-right">Units completed</TableHead>
                <TableHead className="text-right">Hours worked</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No stats imports match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.reportDate}</TableCell>
                    <TableCell>{row.projectName}</TableCell>
                    <TableCell>{row.workerName}</TableCell>
                    <TableCell className="text-right font-medium">{row.unitsCompleted.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{row.hoursWorked.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusToVariant[row.status]}>
                        {row.status === 'in-review' ? 'In review' : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {importDialogOpen ? (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Stats import in progress</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Bulk stat ingestion is handled asynchronously. Refresh this page after a few minutes
              to see the latest results.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setImportDialogOpen(false)}>
                Dismiss
              </Button>
              <Button size="sm" variant="outline">
                View import pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <StatsImportModal
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportStart={async (rows) => {
          try {
            await runStatsImport({
              csv: rows.map((row) => Object.values(row).join(',')).join('\n')
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to import stats');
            throw error;
          }
        }}
        onImportComplete={() => {
          setImportDialogOpen(false);
          toast.success('Stats imported');
        }}
      />
      <StatsDashboard />
    </div>
  );
};

export default StatsPage;
