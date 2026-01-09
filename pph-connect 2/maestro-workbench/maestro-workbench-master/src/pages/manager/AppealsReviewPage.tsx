import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAppealsForReview,
  reviewAppealDecision,
  type AppealRecord,
} from '@/services/appealsService';
import { toast } from 'sonner';

const ManagerAppealsReviewPage: React.FC = () => {
  const { user } = useAuth();
  const reviewerId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [notesByAppeal, setNotesByAppeal] = useState<Record<string, string>>({});

  const { data: appeals = [], isLoading } = useQuery({
    queryKey: ['manager-appeals-review'],
    queryFn: fetchAppealsForReview,
  });

  const mutation = useMutation({
    mutationFn: ({
      removalId,
      decision,
      notes,
    }: {
      removalId: string;
      decision: Extract<AppealRecord['appealStatus'], 'approved' | 'denied'>;
      notes?: string;
    }) => reviewAppealDecision({ removalId, decision, reviewerId: reviewerId!, notes }),
    onSuccess: (_data, variables) => {
      toast.success(`Appeal ${variables.decision} successfully`);
      setNotesByAppeal((prev) => {
        const next = { ...prev };
        delete next[variables.removalId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['manager-appeals-review'] }).catch(() => {
        /* ignore */
      });
    },
    onError: () => {
      toast.error('Unable to record decision. Please try again.');
    },
  });

  const handleDecision = (appealId: string, decision: 'approved' | 'denied') => {
    if (!reviewerId) {
      toast.error('You must be signed in to record a decision.');
      return;
    }
    mutation.mutate({
      removalId: appealId,
      decision,
      notes: notesByAppeal[appealId]?.trim(),
    });
  };

  if (isLoading) {
    return (
      <div
        data-testid="manager-appeals-page"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground"
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading appeals…
      </div>
    );
  }

  return (
    <div data-testid="manager-appeals-page" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Appeals in Review</h1>
        <p className="text-sm text-muted-foreground">
          Review worker submissions for automated removals. Approving an appeal will notify the worker and
          document your notes for future audits.
        </p>
      </div>

      {appeals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No pending appeals right now.
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <Card key={appeal.id} data-testid="appeal-review-card">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Removal #{appeal.id}</CardTitle>
                  <CardDescription>
                    Worker {appeal.workerId} — Project {appeal.projectId}
                  </CardDescription>
                </div>
                <Badge variant="outline">{appeal.appealStatus}</Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase text-muted-foreground/70">Removal reason</p>
                  <p className="font-medium text-foreground">{appeal.removalReason}</p>
                </div>
                {appeal.appealMessage && (
                  <div className="rounded-md bg-muted/30 p-3">
                    <p className="text-xs uppercase text-muted-foreground/70">Worker appeal</p>
                    <p className="text-sm text-foreground">{appeal.appealMessage}</p>
                  </div>
                )}
                {appeal.metricsSnapshot && (
                  <div className="rounded-md border border-muted/50 bg-muted/20 p-3">
                    <p className="text-xs uppercase text-muted-foreground/70">Metrics snapshot</p>
                    <pre className="mt-1 overflow-x-auto text-xs">
                      {JSON.stringify(appeal.metricsSnapshot, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Textarea
                  data-testid="appeal-decision-notes"
                  placeholder="Add context for your decision (shared with worker)."
                  value={notesByAppeal[appeal.id] ?? ''}
                  onChange={(event) =>
                    setNotesByAppeal((prev) => ({ ...prev, [appeal.id]: event.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="appeal-approve-button"
                    variant="default"
                    disabled={mutation.isPending}
                    onClick={() => handleDecision(appeal.id, 'approved')}
                  >
                    {mutation.isPending ? 'Saving…' : 'Approve'}
                  </Button>
                  <Button
                    data-testid="appeal-deny-button"
                    variant="outline"
                    disabled={mutation.isPending}
                    onClick={() => handleDecision(appeal.id, 'denied')}
                  >
                    Deny
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerAppealsReviewPage;
