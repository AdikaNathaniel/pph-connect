import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import PageErrorBoundary from '@/components/errors/PageErrorBoundary';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';

type TeamProjectRecord = {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  status_label?: string | null;
};

type TeamWorkerAssignment = {
  worker_id: string;
  worker_name: string;
  project_id: string;
  project_name: string;
  assigned_at: string;
};

type TeamDetailRecord = {
  id: string;
  team_name: string;
  department?: {
    id: string;
    department_name: string;
    department_code?: string | null;
  } | null;
  locale_primary?: string | null;
  locale_secondary?: string | null;
  locale_region?: string | null;
  is_active: boolean;
  projects: TeamProjectRecord[];
  worker_assignments: TeamWorkerAssignment[];
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
};

const mockTeamDetail: TeamDetailRecord = {
  id: 'team-data',
  team_name: 'Data Labeling',
  department: {
    id: 'dept-ai',
    department_name: 'AI Services',
    department_code: 'AI'
  },
  locale_primary: 'en-US',
  locale_secondary: 'es-MX',
  locale_region: 'US',
  is_active: true,
  projects: [
    {
      id: 'project-atlas',
      project_code: 'ATL-001',
      project_name: 'Project Atlas',
      status: 'active',
      status_label: 'Active'
    },
    {
      id: 'project-beacon',
      project_code: 'BCN-204',
      project_name: 'Project Beacon',
      status: 'paused',
      status_label: 'Paused'
    }
  ],
  worker_assignments: [
    {
      worker_id: 'worker-1',
      worker_name: 'Alex Johnson',
      project_id: 'project-atlas',
      project_name: 'Project Atlas',
      assigned_at: '2024-01-15'
    },
    {
      worker_id: 'worker-2',
      worker_name: 'Maria Lopez',
      project_id: 'project-beacon',
      project_name: 'Project Beacon',
      assigned_at: '2023-11-02'
    },
    {
      worker_id: 'worker-1',
      worker_name: 'Alex Johnson',
      project_id: 'project-beacon',
      project_name: 'Project Beacon',
      assigned_at: '2023-10-20'
    }
  ]
};

export const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);

  const fetchTeam = useCallback(async () => {
    if (!id) {
      setError('Missing team identifier.');
      setTeam(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Replace with real Supabase query when API endpoint is defined.
      const record = mockTeamDetail;
      setTeam(record);
      setIsActive(record.is_active);
    } catch (unexpected) {
      const normalized = normalizeError(unexpected);
      const message = toUserFacingMessage(normalized);
      setError(message);
      setTeam(null);
      toast.error('Failed to load team', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTeam().catch((unexpected) => {
      console.error('Failed to load team', unexpected);
    });
  }, [fetchTeam]);

  const departmentLabel = team?.department
    ? team.department.department_code
      ? `${team.department.department_name} (${team.department.department_code})`
      : team.department.department_name
    : 'Unassigned';

  const uniqueWorkers = useMemo(() => {
    const dedupe = new Map<string, TeamWorkerAssignment>();
    (team?.worker_assignments ?? []).forEach((assignment) => {
      if (!dedupe.has(assignment.worker_id)) {
        dedupe.set(assignment.worker_id, assignment);
      }
    });
    return Array.from(dedupe.values());
  }, [team]);

  const handleToggleActive = async (nextValue: boolean) => {
    setIsActive(nextValue);
    toast.info('Team activation toggle saved locally', {
      description: 'Persistence will be wired once the Teams API is available.'
    });
  };

  return (
    <PageErrorBoundary onReset={fetchTeam}>
    <div className="space-y-6" data-testid="team-detail-page">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : team ? (
        <>
          <header className="space-y-4 border-b border-border/60 pb-6">
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-muted-foreground"
              data-testid="team-detail-breadcrumb"
            >
              <Link
                to="/m/teams"
                className="font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Teams
              </Link>
              <span aria-hidden="true" className="mx-2 text-muted-foreground/60">
                /
              </span>
              <span className="font-medium text-foreground">{team.team_name}</span>
            </nav>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight" data-testid="team-detail-title">
                  {team.team_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  View department ownership, locale coverage, and staffing for this team.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2" data-testid="team-detail-actions">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.info('Team editing coming soon', {
                      description: 'Inline team editing will arrive when the team API is available.'
                    })
                  }
                >
                  Edit Team
                </Button>
              </div>
            </div>
          </header>

          <section data-testid="team-detail-info">
            <Card>
              <CardContent className="grid gap-6 py-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Department
                  </h3>
                  <p className="mt-1 text-sm text-foreground" data-testid="team-detail-info-department">
                    {departmentLabel}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Primary Locale
                  </h3>
                  <p className="mt-1 text-sm text-foreground" data-testid="team-detail-info-locale-primary">
                    {team.locale_primary ?? '—'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Secondary Locale
                  </h3>
                  <p className="mt-1 text-sm text-foreground" data-testid="team-detail-info-locale-secondary">
                    {team.locale_secondary ?? '—'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Region
                  </h3>
                  <p className="mt-1 text-sm text-foreground" data-testid="team-detail-info-region">
                    {team.locale_region ?? '—'}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Active Status
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <Switch
                      checked={isActive}
                      onCheckedChange={handleToggleActive}
                      aria-label="Toggle active status"
                    />
                    <span className="text-sm text-muted-foreground" data-testid="team-detail-info-status">
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section data-testid="team-detail-projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Related Projects</h2>
                <p className="text-sm text-muted-foreground">
                  Projects currently staffed by this team.
                </p>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Code</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.projects.length === 0 ? (
                      <TableRow data-testid="team-detail-projects-empty">
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          This team is not assigned to any projects yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      team.projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Link
                              to={`/m/projects/${project.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {project.project_code}
                            </Link>
                          </TableCell>
                          <TableCell>{project.project_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{project.status_label ?? project.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <section data-testid="team-detail-workers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Related Workers</h2>
                <p className="text-sm text-muted-foreground">
                  Unique workers assigned to projects currently staffed by this team.
                </p>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueWorkers.length === 0 ? (
                      <TableRow data-testid="team-detail-workers-empty">
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No workers are currently staffed via this team.
                        </TableCell>
                      </TableRow>
                    ) : (
                      uniqueWorkers.map((assignment) => (
                        <TableRow key={assignment.worker_id}>
                          <TableCell>
                            <Link
                              to={`/m/workers/${assignment.worker_id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {assignment.worker_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/m/projects/${assignment.project_id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {assignment.project_name}
                            </Link>
                          </TableCell>
                          <TableCell>{formatDate(assignment.assigned_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
    </PageErrorBoundary>
  );
};

export default TeamDetail;
