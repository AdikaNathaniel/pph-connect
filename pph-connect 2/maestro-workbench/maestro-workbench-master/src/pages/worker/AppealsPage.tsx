import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAppealableRemovals,
  submitAppeal,
  type AppealRecord,
} from '@/services/appealsService';
import { toast } from 'sonner';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const statusCopy: Record<AppealRecord['appealStatus'], { label: string; variant: 'default' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  denied: { label: 'Denied', variant: 'destructive' },
};

const WorkerAppealsPage: React.FC = () => {
  const { user } = useAuth();
  const workerId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  const { data: appeals = [], isLoading } = useQuery({
    queryKey: ['worker-appeals', workerId],
    queryFn: () => fetchAppealableRemovals(workerId!),
    enabled: Boolean(workerId),
  });

  const submitMutation = useMutation({
    mutationFn: ({ removalId, message }: { removalId: string; message: string }) =>
      submitAppeal({ removalId, workerId: workerId!, message }),
    onSuccess: (_result, variables) => {
      toast.success('Appeal submitted');
      setMessageDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.removalId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['worker-appeals', workerId] }).catch(() => {
        /* ignore */
      });
    },
    onError: () => {
      toast.error('Unable to submit appeal right now. Please try again.');
    },
  });

  const actionableAppeals = useMemo(
    () => appeals.filter((appeal) => appeal.canAppeal && !appeal.appealSubmittedAt),
    [appeals]
  );

  const handleSubmit = (removalId: string) => {
    const message = messageDrafts[removalId]?.trim();
    if (!message) {
      toast.error('Please add context before submitting your appeal.');
      return;
    }
    if (!workerId) {
      toast.error('You need to be signed in to submit an appeal.');
      return;
    }
    submitMutation.mutate({ removalId, message });
  };

  if (!workerId) {
    return (
      <div
        data-testid="worker-appeals-page"
        className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground"
      >
        Please sign in to review your removals.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        data-testid="worker-appeals-page"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your removal history…
      </div>
    );
  }

  return (
    <div data-testid="worker-appeals-page" className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Appeal Decisions</h1>
        <p className="text-sm text-muted-foreground">
          Request a review when you believe a removal was issued in error. Appeals are shared with the manager
          team along with the original quality snapshot.
        </p>
      </div>

      {appeals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No automated removals on file. Keep up the great work!
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => {
            const statusMeta = statusCopy[appeal.appealStatus];
            const messageDraft = messageDrafts[appeal.id] ?? '';
            return (
              <Card key={appeal.id} className="border-border/80">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      Project {appeal.projectId}
                    </CardTitle>
                    <CardDescription>
                      Removed on {formatDate(appeal.removedAt)} — {appeal.removalReason}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={statusMeta.variant}
                    data-testid="appeal-status-badge"
                    data-status={appeal.appealStatus}
                  >
                    {statusMeta.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {appeal.metricsSnapshot && (
                    <div className="rounded-md bg-muted/40 p-3 text-muted-foreground">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        Metrics snapshot
                      </p>
                      <pre className="mt-1 overflow-x-auto text-xs">
                        {JSON.stringify(appeal.metricsSnapshot, null, 2)}
                      </pre>
                    </div>
                  )}

                  {appeal.appealSubmittedAt && (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">Appeal filed:</span>{' '}
                      {formatDate(appeal.appealSubmittedAt)}
                    </div>
                  )}

                  {appeal.appealDecisionNotes && (
                    <div className="rounded-md border border-muted/60 bg-muted/20 p-3 text-muted-foreground">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                        Manager notes
                      </p>
                      <p className="mt-1 text-sm text-foreground">{appeal.appealDecisionNotes}</p>
                    </div>
                  )}
                </CardContent>
                {appeal.canAppeal && !appeal.appealSubmittedAt && (
                  <CardFooter className="flex flex-col gap-3">
                    <Textarea
                      data-testid="appeal-message-textarea"
                      value={messageDraft}
                      onChange={(event) =>
                        setMessageDrafts((prev) => ({ ...prev, [appeal.id]: event.target.value }))
                      }
                      placeholder="Share why the removal should be reconsidered or add context that was missing."
                      rows={4}
                    />
                    <Button
                      data-testid="submit-appeal-button"
                      className="self-start"
                      disabled={submitMutation.isPending}
                      onClick={() => handleSubmit(appeal.id)}
                    >
                      {submitMutation.isPending ? 'Submitting…' : 'Submit Appeal'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {actionableAppeals.length === 0 && appeals.length > 0 && (
        <div className="rounded-md border border-muted/60 bg-muted/20 p-3 text-sm text-muted-foreground">
          All removals either do not allow appeals or already have a submission in review.
        </div>
      )}
    </div>
  );
};

export default WorkerAppealsPage;
