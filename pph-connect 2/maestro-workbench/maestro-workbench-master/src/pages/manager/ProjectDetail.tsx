import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/status/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import AssignTeamsModal from '@/components/project/AssignTeamsModal';
import TeamForm from '@/components/team/TeamForm';
import AssignWorkersModal from '@/components/project/AssignWorkersModal';
import type { TeamFormValues } from '@/types/app';
import PageErrorBoundary from '@/components/errors/PageErrorBoundary';
import { normalizeError, toUserFacingMessage } from '@/lib/errors';

type ProjectTeamAssignment = {
  id: string;
  assigned_at: string;
  teams: {
    id: string;
    team_name: string;
    locale_primary: string;
    locale_secondary?: string | null;
    locale_region?: string | null;
  } | null;
};

type ProjectWorkerAssignment = {
  id: string;
  assigned_at: string;
  assigned_by?: string | null;
  removed_at?: string | null;
  workers: {
    id: string;
    hr_id: string;
    full_name: string;
    status: string;
    worker_accounts: Array<{
      worker_account_email: string;
      is_current: boolean;
    }>;
  } | null;
};

type ProjectDetailRecord = {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  expert_tier?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  required_qualifications?: string[] | null;
  department?: {
    id: string;
    department_name: string;
    department_code?: string | null;
  } | null;
  teams: ProjectTeamAssignment[];
  workers: ProjectWorkerAssignment[];
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

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isAssignWorkersOpen, setAssignWorkersOpen] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string; code?: string | null }>>(
    []
  );
  const [localeOptions] = useState<string[]>(['en-US', 'en-GB', 'es-MX', 'fil-PH', 'fr-CA']);
  const [regionOptions] = useState<string[]>(['US', 'MX', 'GB', 'PH', 'CA']);
  const [isCreateTeamVisible, setCreateTeamVisible] = useState(false);

  const fetchProject = React.useCallback(async () => {
    if (!id) {
      setError('Missing project identifier.');
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('projects')
        .select(
          `
          id,
          project_code,
          project_name,
          status,
          expert_tier,
          start_date,
          end_date,
          description,
          required_qualifications,
          department:departments (
            id,
            department_name,
            department_code
          ),
          teams:project_teams (
            id,
            assigned_at,
            teams (
              id,
              team_name,
              locale_primary,
              locale_secondary,
              locale_region
            )
          ),
          workers:worker_assignments (
            id,
            assigned_at,
            assigned_by,
            removed_at,
            workers (
              id,
              hr_id,
              full_name,
              status,
              worker_accounts (
                worker_account_email,
                is_current
              )
            )
          )
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      if (!data) {
        throw new Error('Project not found.');
      }

      const record = data as unknown as ProjectDetailRecord;
      setProject(record);
      if (record.department) {
        setDepartmentOptions([
          {
            id: record.department.id,
            name: record.department.department_name,
            code: record.department.department_code ?? undefined
          }
        ]);
      }
    } catch (queryIssue) {
      const normalized = normalizeError(queryIssue);
      const message = toUserFacingMessage(normalized);
      setError(message);
      setProject(null);
      toast.error('Failed to load project', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject().catch((unexpected) => {
      console.error('Failed to load project', unexpected);
    });
  }, [fetchProject]);

  const departmentLabel = project?.department
    ? project.department.department_code
      ? `${project.department.department_name} (${project.department.department_code})`
      : project.department.department_name
    : 'Unassigned';

  const requiredQualifications = useMemo(() => {
    const source = project?.required_qualifications;
    if (!source) {
      return [];
    }

    const normalizedArray = Array.isArray(source)
      ? source
      : typeof source === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(source);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];

    return normalizedArray
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value): value is string => Boolean(value));
  }, [project?.required_qualifications]);

  const teamsEmpty = (project?.teams?.length ?? 0) === 0;
  const currentWorkerAssignments = useMemo(
    () =>
      project?.workers?.filter((assignment) => !assignment.workers?.status || assignment.workers?.status) ?? [],
    [project]
  );
  const workersEmpty = currentWorkerAssignments.length === 0;
  const findCurrentEmail = useCallback(
    (worker: ProjectDetailRecord['workers'][number]['workers']) => {
      if (!worker) {
        return '—';
      }
      const currentAccount = worker.worker_accounts?.find((account) => account.is_current);
      return currentAccount?.worker_account_email ?? '—';
    },
    []
  );
  const handleCreateTeam = useCallback(
    async (values: TeamFormValues) => {
      toast.info('Team creation coming soon', {
        description: `${values.name} will be available once team management is connected.`
      });
      setCreateTeamVisible(false);
    },
    []
  );
  const handleCancelCreateTeam = useCallback(() => {
    setCreateTeamVisible(false);
  }, []);
  const assignTeamsUI = useMemo(
    () => ({
      teamFormProps: {
        mode: 'create' as const,
        onSubmit: handleCreateTeam,
        onCancel: handleCancelCreateTeam,
        departmentOptions,
        localeOptions,
        regionOptions,
        isSubmitting: false
      }
    }),
    [handleCreateTeam, handleCancelCreateTeam, departmentOptions, localeOptions, regionOptions]
  );

  return (
    <PageErrorBoundary onReset={fetchProject}>
    <div className="space-y-6" data-testid="project-detail-page">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : project ? (
        <>
          <header className="space-y-4 border-b border-border/60 pb-6">
            <nav
              aria-label="Breadcrumb"
              className="text-sm text-muted-foreground"
              data-testid="project-detail-breadcrumb"
            >
              <Link
                to="/m/projects"
                className="font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Projects
              </Link>
              <span aria-hidden="true" className="mx-2 text-muted-foreground/60">
                /
              </span>
              <span className="font-medium text-foreground">{project.project_name}</span>
            </nav>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight" data-testid="project-detail-title">
                    {project.project_name}
                  </h1>
                  <span data-testid="project-detail-status">
                    <StatusBadge status={project.status} />
                  </span>
                  <Badge variant="outline">{project.project_code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Department ownership, expert tier, and scheduling details are summarized below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2" data-testid="project-detail-actions">
                <Button
                  variant="outline"
                  data-testid="project-detail-action-edit"
                  onClick={() =>
                    toast.info('Edit project coming soon', {
                      description: 'Project editing will support inline updates in an upcoming release.'
                    })
                  }
                >
                  Edit Project
                </Button>
                <Button
                  variant="outline"
                  data-testid="project-detail-action-assign-teams"
                  onClick={() => setAssignModalOpen(true)}
                >
                  Assign Teams
                </Button>
                <Button
                  data-testid="project-detail-action-assign-workers"
                  onClick={() => setAssignWorkersOpen(true)}
                >
                  Assign Workers
                </Button>
              </div>
            </div>
          </header>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2" data-testid="project-detail-tabs">
              <TabsTrigger value="info">Overview</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="workers">Workers</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <section data-testid="project-detail-info">
                <Card>
                  <CardContent className="grid gap-6 py-6 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Department
                      </h3>
                      <p className="mt-1 text-sm text-foreground" data-testid="project-detail-info-department">
                        {departmentLabel}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Expert Tier
                      </h3>
                      <p
                        className="mt-1 text-sm text-foreground"
                        data-testid="project-detail-info-tier"
                      >
                        {project.expert_tier ? project.expert_tier.replace(/_/g, ' ') : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </h3>
                      <p
                        className="mt-1 text-sm text-foreground"
                        data-testid="project-detail-info-status"
                      >
                        {project.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Start Date
                      </h3>
                      <p className="mt-1 text-sm text-foreground" data-testid="project-detail-info-start">
                        {formatDate(project.start_date)}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        End Date
                      </h3>
                      <p className="mt-1 text-sm text-foreground" data-testid="project-detail-info-end">
                        {formatDate(project.end_date)}
                      </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </h3>
                      <p className="mt-1 text-sm text-foreground" data-testid="project-detail-info-description">
                        {project.description?.length ? project.description : 'No description provided.'}
                      </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Qualifications
                      </h3>
                      <div className="mt-2" data-testid="project-detail-info-qualifications">
                        {requiredQualifications.length ? (
                          <div className="flex flex-wrap gap-2">
                            {requiredQualifications.map((qualification) => (
                              <Badge key={qualification} variant="outline">
                                {qualification}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No qualification requirements.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            <TabsContent value="teams">
              <section data-testid="project-detail-teams" className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Assigned Teams</h2>
                    <p className="text-sm text-muted-foreground">
                      Teams currently supporting this project, with locale specializations.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCreateTeamVisible((current) => !current)}
                      data-testid="project-detail-teams-new"
                    >
                      {isCreateTeamVisible ? 'Hide New Team' : 'New Team'}
                    </Button>
                    <Button
                      variant="outline"
                      data-testid="project-detail-teams-assign"
                      onClick={() => setAssignModalOpen(true)}
                    >
                      Assign Teams
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Name</TableHead>
                          <TableHead>Primary Locale</TableHead>
                          <TableHead>Secondary Locale</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamsEmpty
                          ? (
                            <TableRow data-testid="project-detail-teams-empty">
                              <TableCell
                                colSpan={6}
                                className="py-6 text-center text-sm text-muted-foreground"
                              >
                                No teams assigned yet. Use &ldquo;Assign Teams&rdquo; to link a team.
                              </TableCell>
                            </TableRow>
                            )
                          : project.teams.map((assignment) => {
                              const team = assignment.teams;
                              return (
                                <TableRow key={assignment.id}>
                                  <TableCell className="font-medium">
                                    {team ? (
                                      <Link
                                        to={`/m/teams/${team.id}`}
                                        className="text-primary underline-offset-4 hover:text-primary/80 hover:underline"
                                      >
                                        {team.team_name}
                                      </Link>
                                    ) : (
                                      'Unknown team'
                                    )}
                                  </TableCell>
                                  <TableCell>{team?.locale_primary ?? '—'}</TableCell>
                                  <TableCell>{team?.locale_secondary ?? '—'}</TableCell>
                                  <TableCell>{team?.locale_region ?? '—'}</TableCell>
                                  <TableCell>{formatDate(assignment.assigned_at)}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label="Team actions">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem disabled>Remove Team</DropdownMenuItem>
                                        <DropdownMenuItem disabled>View Team Detail</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {isCreateTeamVisible ? (
                  <Card>
                    <CardContent className="py-6">
                      <TeamForm {...assignTeamsUI.teamFormProps} />
                    </CardContent>
                  </Card>
                ) : null}
              </section>
            </TabsContent>

            <TabsContent value="workers">
              <section data-testid="project-detail-workers" className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Assigned Workers</h2>
                    <p className="text-sm text-muted-foreground">
                      Active worker assignments supporting this project. Remove entries to unassign.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      data-testid="project-detail-workers-history"
                      onClick={() =>
                        toast.info('Assignment history coming soon', {
                          description: 'Detailed worker assignment logs will arrive in a future update.'
                        })
                      }
                    >
                      View Assignment History
                    </Button>
                    <Button
                      data-testid="project-detail-workers-assign"
                      onClick={() => setAssignWorkersOpen(true)}
                    >
                      Assign Workers
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>HR ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Current Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Assigned By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workersEmpty ? (
                          <TableRow data-testid="project-detail-workers-empty">
                            <TableCell
                              colSpan={7}
                              className="py-6 text-center text-sm text-muted-foreground"
                            >
                              No workers assigned yet. Use &ldquo;Assign Workers&rdquo; to add staffing.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentWorkerAssignments.map((assignment) => {
                            const worker = assignment.workers;
                            return (
                              <TableRow key={assignment.id}>
                                <TableCell>{worker?.hr_id ?? '—'}</TableCell>
                                <TableCell className="font-medium">
                                  {worker ? (
                                    <Link
                                      to={`/m/workers/${worker.id}`}
                                      className="text-primary underline-offset-4 hover:text-primary/80 hover:underline"
                                    >
                                      {worker.full_name}
                                    </Link>
                                  ) : (
                                    'Unknown worker'
                                  )}
                                </TableCell>
                                <TableCell>{findCurrentEmail(worker)}</TableCell>
                                <TableCell>{worker?.status?.replace(/_/g, ' ') ?? '—'}</TableCell>
                                <TableCell>{formatDate(assignment.assigned_at)}</TableCell>
                                <TableCell>{assignment.assigned_by ?? '—'}</TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" aria-label="Worker actions">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem disabled>Remove Worker</DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          toast.info('Worker detail coming soon', {
                                            description: 'Shortcut to worker detail will be enabled shortly.'
                                          })
                                        }
                                      >
                                        View Worker
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>
          </Tabs>
          <AssignTeamsModal
            open={isAssignModalOpen}
            onClose={() => setAssignModalOpen(false)}
            onSuccess={() => {
              setAssignModalOpen(false);
              fetchProject().catch((unexpected) => {
                console.error('Failed to refresh project after assigning teams', unexpected);
              });
            }}
            projectId={project.id}
            departmentId={project.department?.id ?? null}
          />
          <AssignWorkersModal
            open={isAssignWorkersOpen}
            onClose={() => setAssignWorkersOpen(false)}
            onSuccess={() => {
              setAssignWorkersOpen(false);
              fetchProject().catch((unexpected) => {
                console.error('Failed to refresh workers after assignment', unexpected);
              });
            }}
            projectId={project.id}
            departmentId={project.department?.id ?? null}
          />
        </>
      ) : null}
    </div>
    </PageErrorBoundary>
  );
};

export default ProjectDetail;
