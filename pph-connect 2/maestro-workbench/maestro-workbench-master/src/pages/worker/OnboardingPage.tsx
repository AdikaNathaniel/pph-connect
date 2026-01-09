import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, RefreshCcw } from 'lucide-react';
import WorkerLayout from '@/components/layout/WorkerLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOnboardingProgress,
  completeOnboardingStep,
  resetOnboardingStep,
  WORKFLOW_STEPS,
  type OnboardingStep,
} from '@/services/onboardingWorkflowService';
import {
  assignTrainingForWorker,
  fetchTrainingAssignments,
  markTrainingCompleted,
  type TrainingAssignment,
} from '@/services/trainingAssignmentService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const getStatusVariant = (status: OnboardingStep['status']) => (status === 'completed' ? 'default' : 'outline');

const WorkerOnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const workerId = user?.id ?? null;
  const queryClient = useQueryClient();

  const { data: steps = WORKFLOW_STEPS, isLoading } = useQuery({
    queryKey: ['worker-onboarding', workerId],
    queryFn: () => getOnboardingProgress(workerId),
    enabled: Boolean(workerId),
    initialData: WORKFLOW_STEPS,
  });

  const completeMutation = useMutation({
    mutationFn: (stepId: string) => completeOnboardingStep(workerId!, stepId),
    onSuccess: (_, stepId) => {
      toast.success('Step marked as completed');
      queryClient.invalidateQueries({ queryKey: ['worker-onboarding', workerId] }).catch(() => {});
    },
    onError: () => toast.error('Unable to update step right now.'),
  });

  const resetMutation = useMutation({
    mutationFn: (stepId: string) => resetOnboardingStep(workerId!, stepId),
    onSuccess: () => {
      toast.message('Step reset');
      queryClient.invalidateQueries({ queryKey: ['worker-onboarding', workerId] }).catch(() => {});
    },
    onError: () => toast.error('Unable to reset step right now.'),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['worker-training-assignments', workerId],
    queryFn: () => fetchTrainingAssignments(workerId),
    enabled: Boolean(workerId),
    initialData: [] as TrainingAssignment[],
  });

  const assignMutation = useMutation({
    mutationFn: () => assignTrainingForWorker(workerId!),
    onSuccess: (result) => {
      const count = result.assigned.length;
      if (count > 0) {
        toast.success(`Assigned ${count} training module${count === 1 ? '' : 's'}.`);
      } else {
        toast.message('No new training modules available right now.');
      }
      queryClient.invalidateQueries({ queryKey: ['worker-training-assignments', workerId] }).catch(() => {});
    },
    onError: () => toast.error('Unable to assign training modules.'),
  });

  const completeTrainingMutation = useMutation({
    mutationFn: (assignmentId: string) => markTrainingCompleted(workerId!, assignmentId),
    onSuccess: () => {
      toast.success('Training marked complete');
      queryClient.invalidateQueries({ queryKey: ['worker-training-assignments', workerId] }).catch(() => {});
    },
    onError: () => toast.error('Unable to update training status.'),
  });

  const completedCount = steps.filter((step) => step.status === 'completed').length;
  const hasAssignments = assignments.length > 0;

  return (
    <WorkerLayout>
      <div data-testid="worker-onboarding-page" className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Onboarding Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Track every milestone from welcome email to unlocking your first project.
          </p>
          <Badge variant="outline">
            {completedCount} / {WORKFLOW_STEPS.length} steps completed
          </Badge>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your onboarding progress…
          </div>
        )}

        <div className="grid gap-4">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed';
            return (
              <Card key={step.id} data-testid="onboarding-step-card" className="border-border/80">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(step.status)}>{isCompleted ? 'Completed' : 'Pending'}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {step.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-testid="onboarding-complete-button"
                      size="sm"
                      disabled={!workerId || isCompleted || completeMutation.isPending}
                      onClick={() => completeMutation.mutate(step.id)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                    {isCompleted && (
                      <Button
                        data-testid="onboarding-reset-button"
                        size="sm"
                        variant="ghost"
                        disabled={!workerId || resetMutation.isPending}
                        onClick={() => resetMutation.mutate(step.id)}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card data-testid="training-assignments-section">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Assigned Training</CardTitle>
              <CardDescription>Modules auto-selected from your domain expertise.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!workerId || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              {assignMutation.isPending ? 'Assigning…' : 'Check for modules'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignmentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading training assignments…
              </div>
            ) : !hasAssignments ? (
              <p className="text-sm text-muted-foreground">No training modules assigned yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-border/70 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{assignment.title}</p>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground">{assignment.description}</p>
                      )}
                      {assignment.domainTags.length > 0 && (
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                          Domains: {assignment.domainTags.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={assignment.status === 'completed' ? 'default' : 'outline'}>
                        {assignment.status === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                      {assignment.status === 'pending' && (
                        <Button
                          data-testid="training-complete-button"
                          size="sm"
                          disabled={completeTrainingMutation.isPending}
                          onClick={() => completeTrainingMutation.mutate(assignment.id)}
                        >
                          {completeTrainingMutation.isPending ? 'Saving…' : 'Mark Complete'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
};

export default WorkerOnboardingPage;
