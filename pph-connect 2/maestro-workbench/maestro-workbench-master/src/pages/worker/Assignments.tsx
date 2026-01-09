import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CalendarDays, CircleCheck, Clock, FolderOpen, RefreshCcw, Shield, Target } from 'lucide-react';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};

const formatRelativeDate = (value: string | null) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  const now = new Date();
  const diff = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diff)) return formatDate(value);
  if (diff === 0) return 'Assigned today';
  if (diff === 1) return 'Assigned yesterday';
  return `Assigned ${diff} days ago`;
};

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type ProjectAssignmentRow = Database['public']['Tables']['project_assignments']['Row'];

type AssignmentRecord = ProjectAssignmentRow & {
  project: ProjectRow | null;
};

const trackableStatus = (status?: string | null) => {
  if (!status) return 'unknown';
  return status;
};

export const WorkerAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('project_assignments')
      .select(
        `id, worker_id, project_id, assigned_at, priority,
        project:projects (
          id,
          name,
          project_code,
          status,
          start_date,
          end_date,
          description,
          locale,
          training_required,
          training_module_id
        )`
      )
      .eq('worker_id', user.id)
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('WorkerAssignmentsPage: failed to load assignments', error);
      toast.error('Unable to load your assignments');
      setAssignments([]);
    } else {
      setAssignments((data ?? []) as AssignmentRecord[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAssignments().catch((error) => {
      console.warn('WorkerAssignmentsPage: unexpected error', error);
    });
  }, [fetchAssignments]);

  const activeAssignments = useMemo(
    () => assignments.filter((record) => record.project?.status === 'active'),
    [assignments]
  );

  const handleLaunch = useCallback(() => {
    navigate('/w/workbench');
  }, [navigate]);

  const handleRefreshAssignments = useCallback(() => {
    fetchAssignments().catch((error) => {
      console.warn('WorkerAssignmentsPage: refresh error', error);
    });
  }, [fetchAssignments]);

  return (
    <div className="bg-background min-h-screen" data-testid="worker-assignments-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between" data-testid="worker-assignments-header">
          <div>
            <p className="text-sm text-muted-foreground">Projects & work queue</p>
            <h1 className="text-3xl font-bold">Your assignments</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshAssignments} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active projects</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
              <span className="text-2xl font-bold">{activeAssignments.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total assignments</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Target className="h-6 w-6 text-muted-foreground" />
              <span className="text-2xl font-bold">{assignments.length}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most recent</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
              <span className="text-base font-semibold">
                {assignments.length > 0 ? formatRelativeDate(assignments[assignments.length - 1].assigned_at) : 'No assignments yet'}
              </span>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground" data-testid="worker-assignments-loading">
              Loading assignments…
            </CardContent>
          </Card>
        ) : assignments.length === 0 ? (
          <Card data-testid="worker-assignments-empty">
            <CardContent className="p-10 text-center space-y-3">
              <CircleCheck className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">No active assignments</h2>
                <p className="text-sm text-muted-foreground">
                  You are not currently assigned to any projects. Your manager will notify you when new work is available.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="worker-assignments-list">
            {assignments.map((assignment) => {
              const project = assignment.project;
              const status = trackableStatus(project?.status);
              return (
                <Card key={assignment.id} data-testid="worker-assignments-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Project</p>
                        <p className="text-xl font-semibold">
                          {project?.name ?? 'Project removed'}
                          {project?.project_code ? <span className="text-sm text-muted-foreground ml-2">({project.project_code})</span> : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="uppercase tracking-wide">
                          {status}
                        </Badge>
                        <Badge variant="outline">Priority {assignment.priority}</Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-foreground">Assigned</p>
                          <p>{formatDate(assignment.assigned_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderOpen className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-foreground">Locale</p>
                          <p>{project?.locale ?? 'Any'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        <div>
                          <p className="font-medium text-foreground">Training</p>
                          <p>{project?.training_required ? 'Required' : 'Optional'}</p>
                        </div>
                      </div>
                    </div>

                    {project?.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {project.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={handleLaunch}>
                        Open workbench
                      </Button>
                      {project?.training_required ? (
                        <Button variant="outline" size="sm" onClick={() => navigate('/worker/training')}>
                          View training
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerAssignmentsPage;
