import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { triggerQualityWarning } from '@/services/qualityWarningService';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type QualityMetricRow = Database['public']['Tables']['quality_metrics']['Row'];

export interface LowQualityTaskInput {
  taskId: string;
  projectId: string;
  workerId: string;
  projectName?: string | null;
  currentScore?: number | null;
  threshold?: number | null;
  recommendedActions?: string[];
}

export interface LowQualityTaskResult {
  reassigned: boolean;
  reassignedTo?: string | null;
  warningTriggered?: boolean;
}

const pickHigherTrustWorker = async (
  projectId: string,
  excludedWorkerId: string,
  minScore?: number | null
) => {
  const { data, error } = await supabase
    .from('quality_metrics')
    .select('worker_id, metric_value')
    .eq('project_id', projectId)
    .eq('metric_type', 'quality')
    .neq('worker_id', excludedWorkerId)
    .order('metric_value', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('lowQualityTaskService: failed to fetch candidate worker', error);
    return null;
  }

  const candidate = (data ?? []).find((row: QualityMetricRow) => {
    if (row.metric_value == null) return false;
    if (typeof minScore === 'number') {
      return Number(row.metric_value) > minScore;
    }
    return true;
  });

  return candidate?.worker_id ?? null;
};

const markTaskNeedsReview = async (taskId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'needs_review',
      assigned_to: null,
      assigned_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('project_id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as TaskRow | null;
};

const assignTaskToWorker = async (taskId: string, workerId: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'assigned',
      assigned_to: workerId,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (error) {
    console.warn('lowQualityTaskService: failed to reassign task', error);
    return false;
  }

  return true;
};

const logReassignmentEvent = async (taskId: string, fromWorkerId: string, toWorkerId: string | null, reason: string) => {
  const { error } = await supabase
    .from('task_reassignment_events')
    .insert({
      task_id: taskId,
      from_worker_id: fromWorkerId,
      to_worker_id: toWorkerId,
      reason,
    });

  if (error) {
    console.warn('lowQualityTaskService: failed to log reassignment', error);
  }
};

const notifyWorker = async (workerId: string, projectName: string | null | undefined, actions: string[]) => {
  const subject = `Task reassigned for ${projectName ?? 'your project'}`;
  const content = [
    `Hi there,`,
    '',
    `One of your recent submissions for ${projectName ?? 'a managed project'} was flagged for low quality and reassigned for further review.`,
    '',
    'To regain access please:',
    ...actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    'Reach out to your manager if you need clarification.',
    '',
    '— Quality Operations Team',
  ].join('\n');

  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_ids: [workerId],
        subject,
        content,
      },
    });
  } catch (error) {
    console.warn('lowQualityTaskService: failed to notify worker', error);
  }
};

export async function reassignLowQualityTask(input: LowQualityTaskInput): Promise<LowQualityTaskResult> {
  const {
    taskId,
    projectId,
    workerId,
    projectName,
    currentScore,
    threshold,
    recommendedActions = [],
  } = input;

  if (!taskId || !projectId || !workerId) {
    return { reassigned: false };
  }

  await markTaskNeedsReview(taskId);

  const candidateWorkerId = await pickHigherTrustWorker(projectId, workerId, currentScore);
  if (candidateWorkerId) {
    await assignTaskToWorker(taskId, candidateWorkerId);
  }

  await logReassignmentEvent(taskId, workerId, candidateWorkerId, 'quality_threshold');

  const warningResult = await triggerQualityWarning({
    workerId,
    projectId,
    projectName,
    currentScore,
    threshold,
    recommendedActions,
  });

  await notifyWorker(workerId, projectName, recommendedActions.length ? recommendedActions : ['Review quality guidelines', 'Complete calibration task']);

  return {
    reassigned: Boolean(candidateWorkerId),
    reassignedTo: candidateWorkerId,
    warningTriggered: warningResult.triggered,
  };
}
