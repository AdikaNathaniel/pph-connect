import React, { useCallback, useEffect, useMemo, useState } from 'react';
import WorkerLayout from '@/components/layout/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface WorkerApplication {
  id: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
  listingId: string | null;
  projectName: string | null;
  projectCode: string | null;
  description: string | null;
}

const statusMeta: Record<ApplicationStatus, { label: string; description: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: {
    label: 'Pending review',
    description: 'Your request is in the review queue. Expect an update soon.',
    badgeVariant: 'outline',
  },
  approved: {
    label: 'Approved',
    description: 'You have been approved for this project. A manager will reach out with next steps.',
    badgeVariant: 'default',
  },
  rejected: {
    label: 'Rejected',
    description: 'This application was not approved. Check the notes for details.',
    badgeVariant: 'secondary',
  },
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const MyApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('worker_applications')
      .select(`
        id,
        status,
        applied_at,
        reviewed_at,
        notes,
        project_listings:project_listings(
          id,
          description,
          projects:projects(
            name,
            project_code
          )
        )
      `)
      .eq('worker_id', user.id)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('MyApplicationsPage: failed to load applications', error);
      toast.error('Unable to load your applications right now.');
      setApplications([]);
    } else {
      setApplications(
        (data ?? []).map((row) => ({
          id: row.id,
          status: (row.status ?? 'pending') as ApplicationStatus,
          appliedAt: row.applied_at ?? null,
          reviewedAt: row.reviewed_at ?? null,
          notes: row.notes ?? null,
          listingId: row.project_listings?.id ?? null,
          projectName: row.project_listings?.projects?.name ?? null,
          projectCode: row.project_listings?.projects?.project_code ?? null,
          description: row.project_listings?.description ?? null,
        }))
      );
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchApplications().catch((error) => console.warn('MyApplicationsPage: unexpected error', error));
  }, [fetchApplications]);

  const emptyStateMessage = useMemo(() => {
    if (loading) {
      return 'Loading your applications…';
    }
    return 'You have not applied to any projects yet.';
  }, [loading]);

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2" data-testid="worker-applications-header">
          <p className="text-sm text-muted-foreground">Marketplace</p>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-sm text-muted-foreground">
            Track your project applications and review manager decisions in one place.
          </p>
        </div>

        <div data-testid="worker-applications-list" className="grid gap-4">
          {applications.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              {emptyStateMessage}
            </div>
          ) : (
            applications.map((application) => {
              const meta = statusMeta[application.status] ?? statusMeta.pending;
              return (
                <Card key={application.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {application.projectName ?? 'Project'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {application.projectCode ?? application.listingId ?? 'Listing'}
                      </p>
                    </div>
                    <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>{meta.description}</p>
                    </div>
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground">Applied</p>
                        <p className="font-medium">{formatDate(application.appliedAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last updated</p>
                        <p className="font-medium">{formatDate(application.reviewedAt) ?? '—'}</p>
                      </div>
                    </div>
                    {application.description ? (
                      <div className="rounded-md border border-dashed border-border/40 bg-muted/30 p-3 text-sm text-muted-foreground">
                        {application.description}
                      </div>
                    ) : null}
                    {application.notes ? (
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">Review notes</p>
                        <p className="rounded-md border border-border/50 bg-muted/30 p-3 whitespace-pre-line">
                          {application.notes}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </WorkerLayout>
  );
};

export default MyApplicationsPage;
