import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { approveWorkerApplication, rejectWorkerApplication } from '@/services/applicationApprovalService';

type WorkerApplicationRow = Database['public']['Tables']['worker_applications']['Row'];
type WorkerRow = Database['public']['Tables']['workers']['Row'];
type ProjectListingRow = Database['public']['Tables']['project_listings']['Row'];

type ApplicationStatus = WorkerApplicationRow['status'];

interface ProjectApplicationItem {
  id: string;
  status: ApplicationStatus;
  workerId: string | null;
  workerName: string;
  workerHrId: string | null;
  workerTier: string | null;
  workerSkills: string[];
  workerLocales: string[];
  coverMessage: string | null;
  appliedAt: string | null;
  listingId: string | null;
  listingDescription: string | null;
  capacityCurrent: number;
  capacityMax: number;
  qualityScore: number | null;
}

const statusMeta: Record<ApplicationStatus, { label: string; badgeVariant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pending', badgeVariant: 'outline' },
  approved: { label: 'Approved', badgeVariant: 'default' },
  rejected: { label: 'Rejected', badgeVariant: 'secondary' },
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(
      new Date(value)
    );
  } catch {
    return value;
  }
};

export const ProjectApplicationsPage: React.FC = () => {
  const { id } = useParams();
  const projectId = id ?? '';
  const { user } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectCode, setProjectCode] = useState<string | null>(null);
  const [applications, setApplications] = useState<ProjectApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  const fetchProjectMeta = useCallback(async () => {
    if (!projectId) {
      setProjectName(null);
      setProjectCode(null);
      return;
    }
    const { data, error } = await supabase
      .from('projects')
      .select('project_name, project_code')
      .eq('id', projectId)
      .maybeSingle();

    if (error) {
      console.warn('ProjectApplicationsPage: failed to load project metadata', error);
      setProjectName(null);
      setProjectCode(null);
      return;
    }

    setProjectName(data?.project_name ?? null);
    setProjectCode(data?.project_code ?? null);
  }, [projectId]);

  const fetchApplications = useCallback(async () => {
    if (!projectId) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('worker_applications')
      .select(`
        id,
        worker_id,
        project_listing_id,
        status,
        applied_at,
        reviewed_at,
        notes,
        workers:workers(
          id,
          full_name,
          hr_id,
          worker_role,
          expert_tier,
          skills,
          locale_all
        ),
        project_listings!inner(
          id,
          project_id,
          description,
          capacity_max,
          capacity_current
        )
      `)
      .eq('project_listings.project_id', projectId)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('ProjectApplicationsPage: failed to load applications', error);
      toast.error('Unable to load applications right now.');
      setApplications([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Array<
      WorkerApplicationRow & {
        workers: WorkerRow | null;
        project_listings: ProjectListingRow | null;
      }
    >;

    const workerIds = Array.from(
      new Set(
        rows
          .map((row) => row.worker_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    );

    let qualityByWorker: Record<string, number> = {};
    if (workerIds.length) {
      const { data: qualityData, error: qualityError } = await supabase
        .from('quality_metrics')
        .select('worker_id, metric_value')
        .in('worker_id', workerIds)
        .eq('metric_type', 'quality')
        .eq('project_id', projectId)
        .order('measured_at', { ascending: false });

      if (qualityError) {
        console.warn('ProjectApplicationsPage: failed to load quality metrics', qualityError);
      } else {
        qualityByWorker = (qualityData ?? []).reduce<Record<string, number>>((acc, row) => {
          if (!row.worker_id || row.metric_value == null) {
            return acc;
          }
          if (acc[row.worker_id]) {
            return acc;
          }
          acc[row.worker_id] = Number(row.metric_value);
          return acc;
        }, {});
      }
    }

    const normalized = rows.map<ProjectApplicationItem>((row) => ({
      id: row.id,
      status: (row.status ?? 'pending') as ApplicationStatus,
      workerId: row.worker_id,
      workerName: row.workers?.full_name ?? 'Worker',
      workerHrId: row.workers?.hr_id ?? null,
      workerTier: row.workers?.expert_tier ?? row.workers?.worker_role ?? null,
      workerSkills: Array.isArray(row.workers?.skills) ? (row.workers?.skills as string[]) : [],
      workerLocales: Array.isArray(row.workers?.locale_all) ? (row.workers?.locale_all as string[]) : [],
      coverMessage: row.notes ?? null,
      appliedAt: row.applied_at ?? null,
      listingId: row.project_listings?.id ?? null,
      listingDescription: row.project_listings?.description ?? null,
      capacityCurrent: row.project_listings?.capacity_current ?? 0,
      capacityMax: row.project_listings?.capacity_max ?? 0,
      qualityScore: row.worker_id ? qualityByWorker[row.worker_id] ?? null : null,
    }));

    setApplications(normalized);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProjectMeta().catch((error) => console.warn('ProjectApplicationsPage: unexpected project meta error', error));
  }, [fetchProjectMeta]);

  useEffect(() => {
    fetchApplications().catch((error) => console.warn('ProjectApplicationsPage: unexpected applications error', error));
  }, [fetchApplications]);

  const isPending = (application: ProjectApplicationItem) => application.status === 'pending';

  const setActionLoading = (applicationId: string, value: boolean) => {
    setActionState((previous) => ({
      ...previous,
      [applicationId]: value,
    }));
  };

  const handleApprove = async (application: ProjectApplicationItem) => {
    if (!projectId || !application.workerId || !application.id || !application.listingId) {
      toast.error('Missing data for approval. Please refresh and try again.');
      return;
    }

    setActionLoading(application.id, true);
    try {
      await approveWorkerApplication({
        applicationId: application.id,
        workerId: application.workerId,
        projectId,
        listingId: application.listingId,
        capacityCurrent: application.capacityCurrent,
        capacityMax: application.capacityMax,
        projectName,
        managerId: user?.id ?? null,
      });
      toast.success('Application approved');
      await fetchApplications();
    } catch (error) {
      console.error('ProjectApplicationsPage: failed to approve application', error);
      toast.error('Unable to approve application. Please try again.');
    } finally {
      setActionLoading(application.id, false);
    }
  };

  const handleReject = async (application: ProjectApplicationItem) => {
    if (!projectId || !application.workerId) {
      toast.error('Missing data for rejection. Please refresh and try again.');
      return;
    }
    const note = (rejectionNotes[application.id] ?? '').trim();

    setActionLoading(application.id, true);
    try {
      await rejectWorkerApplication({
        applicationId: application.id,
        workerId: application.workerId,
        projectName,
        managerId: user?.id ?? null,
        rejectionReason: note,
      });
      toast.success('Application rejected');
      await fetchApplications();
    } catch (error) {
      console.error('ProjectApplicationsPage: failed to reject application', error);
      toast.error('Unable to reject application. Please try again.');
    } finally {
      setActionLoading(application.id, false);
    }
  };

  const headerTitle = useMemo(() => {
    if (!projectName) return 'Project Applications';
    if (projectCode) {
      return `${projectName} (${projectCode}) Applications`;
    }
    return `${projectName} Applications`;
  }, [projectName, projectCode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2" data-testid="project-applications-header">
        <p className="text-sm text-muted-foreground">Projects · Applications</p>
        <h1 className="text-2xl font-bold">{headerTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Review pending applications, validate worker readiness, and approve or reject access.
        </p>
      </div>

      <div data-testid="project-applications-list" className="grid gap-4">
        {loading ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            Loading applications…
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
            No applications for this project yet.
          </div>
        ) : (
          applications.map((application) => {
            const meta = statusMeta[application.status ?? 'pending'] ?? statusMeta.pending;
            const pending = isPending(application);
            return (
              <Card key={application.id} data-testid="project-application-card" data-application-id={application.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      {application.workerName}
                      {application.workerHrId ? (
                        <span className="text-sm font-normal text-muted-foreground"> · {application.workerHrId}</span>
                      ) : null}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      {application.workerTier ? <span>Tier: {application.workerTier}</span> : null}
                      <span>
                        Applied {application.appliedAt ? formatDate(application.appliedAt) : '—'}
                      </span>
                      <span>
                        Capacity {application.capacityCurrent}/{application.capacityMax}
                      </span>
                    </div>
                  </div>
                  <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Quality score</p>
                      <p className="font-medium">
                        {application.qualityScore != null ? application.qualityScore.toFixed(2) : 'No data'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Locales</p>
                      <p className="font-medium">
                        {application.workerLocales.length ? application.workerLocales.join(', ') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Skills</p>
                      <p className="font-medium">
                        {application.workerSkills.length ? application.workerSkills.join(', ') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cover message</p>
                      <p className="font-medium whitespace-pre-line">
                        {application.coverMessage ? application.coverMessage : '—'}
                      </p>
                    </div>
                  </div>
                  {pending ? (
                    <div className="space-y-2">
                      <Label htmlFor={`rejection-${application.id}`}>Rejection reason (optional)</Label>
                      <Textarea
                        id={`rejection-${application.id}`}
                        value={rejectionNotes[application.id] ?? ''}
                        onChange={(event) =>
                          setRejectionNotes((previous) => ({
                            ...previous,
                            [application.id]: event.target.value,
                          }))
                        }
                        placeholder="Share context with the worker if you reject their application."
                        rows={3}
                      />
                    </div>
                  ) : null}
                  {pending ? (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="sm"
                        data-testid="project-application-approve"
                        onClick={() => handleApprove(application)}
                        disabled={actionState[application.id]}
                      >
                        {actionState[application.id] ? 'Approving…' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReject(application)}
                        disabled={actionState[application.id]}
                      >
                        {actionState[application.id] ? 'Processing…' : 'Reject'}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProjectApplicationsPage;
