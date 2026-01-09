import { supabase } from '@/integrations/supabase/client';
import type { PerformanceSnapshot } from '@/services/performanceMonitoringService';
import { createQualityAlert } from '@/services/qualityAlertService';
import { triggerQualityWarning } from '@/services/qualityWarningService';
import type { PerformanceZone } from '@/services/performanceMonitoringLogic';

export type ProgressiveAction =
  | 'notify_worker'
  | 'recommend_training'
  | 'notify_manager'
  | 'escalated_warning'
  | 'manager_review'
  | 'pause_assignments'
  | 'auto_remove';

export interface ProgressiveActionInput extends PerformanceSnapshot {
  projectName?: string | null;
  workerName?: string | null;
}

export interface ProgressiveActionPlan {
  workerId: string;
  projectId: string;
  projectName?: string | null;
  workerName?: string | null;
  zone: PerformanceZone;
  actions: ProgressiveAction[];
  reasons: string[];
  metadata: {
    consecutiveDays: number;
    trainingRecommendations: string[];
    warningDueDate?: string | null;
    removalReason?: string | null;
    metricsSnapshot?: Record<string, unknown>;
  };
}

const TRAINING_RECOMMENDATIONS = [
  'Review the latest performance playbook',
  'Complete the targeted calibration module',
  'Schedule a 1:1 coaching session with your lead',
];

const WARNING_DEADLINES: Record<PerformanceZone, number> = {
  green: 0,
  yellow: 5,
  orange: 3,
  red: 1,
};

const defaultMetricsSnapshot = (input: ProgressiveActionInput) => ({
  accuracy7d: input.accuracy7d ?? null,
  accuracy30d: input.accuracy30d ?? null,
  rejectionRate7d: input.rejectionRate7d ?? null,
  rejectionRate30d: input.rejectionRate30d ?? null,
  iaa7d: input.iaa7d ?? null,
  iaa30d: input.iaa30d ?? null,
  latency7d: input.latency7d ?? null,
  latency30d: input.latency30d ?? null,
  reasons: input.reasons ?? [],
  consecutiveDaysBelow: input.consecutiveDaysBelow ?? 0,
});

const buildWarningDueDate = (zone: PerformanceZone) => {
  const days = WARNING_DEADLINES[zone] ?? 5;
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
};

export function buildProgressiveActionPlan(input: ProgressiveActionInput): ProgressiveActionPlan {
  const reasons = input.reasons ?? [];
  const actions: ProgressiveAction[] = [];
  const metadata = {
    consecutiveDays: input.consecutiveDaysBelow ?? 0,
    trainingRecommendations: [...TRAINING_RECOMMENDATIONS],
    warningDueDate: buildWarningDueDate(input.zone),
    removalReason: undefined as string | undefined,
    metricsSnapshot: defaultMetricsSnapshot(input),
  };

  switch (input.zone) {
    case 'yellow':
      actions.push('notify_worker', 'recommend_training', 'notify_manager');
      break;
    case 'orange':
      actions.push('notify_worker', 'recommend_training', 'escalated_warning', 'manager_review', 'pause_assignments');
      break;
    case 'red':
      actions.push('notify_worker', 'escalated_warning', 'notify_manager', 'manager_review', 'auto_remove', 'pause_assignments');
      metadata.removalReason = 'performance_zone_red';
      break;
    default:
      break;
  }

  return {
    workerId: input.workerId,
    projectId: input.projectId,
    projectName: input.projectName,
    workerName: input.workerName,
    zone: input.zone,
    actions,
    reasons,
    metadata,
  };
}

const notifyManagers = async (plan: ProgressiveActionPlan, subject: string, content: string) => {
  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_roles: ['manager'],
        subject,
        content,
      },
    });
  } catch (error) {
    console.warn('progressiveActionService: failed to notify managers', error);
  }
};

const logAssignmentPause = async (plan: ProgressiveActionPlan) => {
  try {
    await supabase.from('quality_alerts').insert({
      alert_type: 'assignment_pause',
      project_id: plan.projectId,
      worker_id: plan.workerId,
      message: `Assignment intake paused due to ${plan.zone} zone performance`,
      metric_value: plan.metadata.metricsSnapshot?.accuracy7d ?? null,
    });
  } catch (error) {
    console.warn('progressiveActionService: failed to log assignment pause', error);
  }
};

const enqueueAutoRemoval = async (plan: ProgressiveActionPlan) => {
  try {
    await supabase.from('auto_removals').insert({
      worker_id: plan.workerId,
      project_id: plan.projectId,
      removal_reason: plan.metadata.removalReason ?? 'performance_zone_red',
      metrics_snapshot: plan.metadata.metricsSnapshot ?? {},
      can_appeal: true,
    });
  } catch (error) {
    console.error('progressiveActionService: failed to insert auto removal', error);
  }
};

export async function applyProgressiveActionPlan(plan: ProgressiveActionPlan) {
  if (!plan.actions.length) {
    return { executed: [] as ProgressiveAction[] };
  }

  const executed: ProgressiveAction[] = [];
  const projectLabel = plan.projectName ?? 'assigned project';
  const workerLabel = plan.workerName ?? plan.workerId;

  if (plan.actions.includes('notify_worker') || plan.actions.includes('recommend_training') || plan.actions.includes('escalated_warning')) {
    try {
      await triggerQualityWarning({
        workerId: plan.workerId,
        projectId: plan.projectId,
        projectName: plan.projectName,
        currentScore: plan.metadata.metricsSnapshot?.accuracy7d ?? null,
        threshold: null,
        recommendedActions: plan.metadata.trainingRecommendations,
        resolutionDue: plan.metadata.warningDueDate ?? undefined,
      });
      executed.push('notify_worker');
    } catch (error) {
      console.warn('progressiveActionService: failed to trigger worker warning', error);
    }
  }

  if (plan.actions.includes('notify_manager') || plan.actions.includes('manager_review')) {
    const alertMessage = `${workerLabel} entered ${plan.zone} zone on ${projectLabel}. Reasons: ${plan.reasons.join(', ') || 'n/a'}.`;
    try {
      await createQualityAlert({
        alertType: plan.zone === 'red' ? 'auto_removal_triggered' : 'performance_warning',
        projectId: plan.projectId,
        workerId: plan.workerId,
        message: alertMessage,
        metricValue: plan.metadata.metricsSnapshot?.accuracy7d ?? null,
        threshold: null,
      });
      await notifyManagers(plan, `Performance ${plan.zone.toUpperCase()} zone`, alertMessage);
      executed.push('notify_manager');
    } catch (error) {
      console.warn('progressiveActionService: failed to alert managers', error);
    }
  }

  if (plan.actions.includes('pause_assignments')) {
    await logAssignmentPause(plan);
    executed.push('pause_assignments');
  }

  if (plan.actions.includes('auto_remove')) {
    await enqueueAutoRemoval(plan);
    executed.push('auto_remove');
  }

  return { executed };
}

export async function handleProgressiveActions(inputs: ProgressiveActionInput[]) {
  if (!inputs?.length) {
    return { processed: 0, actedOn: 0 };
  }

  let actedOn = 0;
  for (const input of inputs) {
    const plan = buildProgressiveActionPlan(input);
    if (!plan.actions.length) {
      continue;
    }
    await applyProgressiveActionPlan(plan);
    actedOn += 1;
  }

  return { processed: inputs.length, actedOn };
}
