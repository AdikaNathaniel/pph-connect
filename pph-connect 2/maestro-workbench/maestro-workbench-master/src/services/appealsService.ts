import { supabase } from '@/integrations/supabase/client';

export type AppealDecision = 'pending' | 'approved' | 'denied';

export interface AppealRecord {
  id: string;
  workerId: string;
  projectId: string;
  removalReason: string;
  metricsSnapshot: Record<string, unknown> | null;
  removedAt: string;
  canAppeal: boolean;
  appealStatus: AppealDecision;
  appealMessage?: string | null;
  appealSubmittedAt?: string | null;
  appealReviewedBy?: string | null;
  appealDecisionAt?: string | null;
  appealDecisionNotes?: string | null;
}

export interface SubmitAppealInput {
  removalId: string;
  workerId: string;
  message: string;
}

export interface ReviewAppealInput {
  removalId: string;
  reviewerId: string;
  decision: Extract<AppealDecision, 'approved' | 'denied'>;
  notes?: string;
}

const toAppealRecord = (row: any): AppealRecord => ({
  id: row.id,
  workerId: row.worker_id,
  projectId: row.project_id,
  removalReason: row.removal_reason,
  metricsSnapshot: row.metrics_snapshot ?? null,
  removedAt: row.removed_at,
  canAppeal: Boolean(row.can_appeal),
  appealStatus: row.appeal_status ?? 'pending',
  appealMessage: row.appeal_message,
  appealSubmittedAt: row.appeal_submitted_at,
  appealReviewedBy: row.appeal_reviewed_by,
  appealDecisionAt: row.appeal_decision_at,
  appealDecisionNotes: row.appeal_decision_notes,
});

const notifyManagersOfAppeal = async (appeal: AppealRecord) => {
  const subject = `Appeal submitted for removal ${appeal.id}`;
  const content = [
    `Worker ${appeal.workerId} appealed their removal from project ${appeal.projectId}.`,
    '',
    `Reason: ${appeal.removalReason}`,
    `Appeal message: ${appeal.appealMessage ?? 'n/a'}`,
    '',
    'Visit the auto removals dashboard to review.',
  ].join('\n');

  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_roles: ['manager'],
        subject,
        content,
      },
    });
  } catch (error) {
    console.warn('appealsService: failed to notify managers of appeal', error);
  }
};

const notifyWorkerOfDecision = async (workerId: string, projectId: string, decision: AppealDecision, notes?: string) => {
  const subject = `Appeal ${decision === 'approved' ? 'approved' : 'decision'} for project ${projectId}`;
  const content = [
    `Hi there,`,
    '',
    `Your appeal for the removal on project ${projectId} was ${decision}.`,
    notes ? `Notes: ${notes}` : null,
    '',
    decision === 'approved'
      ? 'You may coordinate with your manager to resume work or review next steps shared in your portal.'
      : 'Please review the feedback above and work with your manager on remediation.',
    '',
    '— Workforce Operations',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_ids: [workerId],
        subject,
        content,
      },
    });
  } catch (error) {
    console.warn('appealsService: failed to notify worker of decision', error);
  }
};

export async function fetchAppealableRemovals(workerId: string): Promise<AppealRecord[]> {
  if (!workerId) return [];

  const { data, error } = await supabase
    .from('auto_removals')
    .select(
      'id, worker_id, project_id, removal_reason, metrics_snapshot, removed_at, can_appeal, appeal_status, appeal_message, appeal_submitted_at'
    )
    .eq('worker_id', workerId)
    .order('removed_at', { ascending: false });

  if (error) {
    console.warn('appealsService: failed to load removals', error);
    return [];
  }

  return (data ?? []).map(toAppealRecord);
}

export async function submitAppeal(input: SubmitAppealInput) {
  const trimmedMessage = input.message?.trim();
  if (!trimmedMessage) {
    return { success: false, reason: 'message_required' as const };
  }

  const submission = {
    appeal_message: trimmedMessage,
    appeal_submitted_at: new Date().toISOString(),
    appeal_status: 'pending',
  };

  const { data, error } = await supabase
    .from('auto_removals')
    .update(submission)
    .eq('id', input.removalId)
    .eq('worker_id', input.workerId)
    .eq('can_appeal', true)
    .select('id, worker_id, project_id, removal_reason, metrics_snapshot, removed_at, can_appeal, appeal_status, appeal_message, appeal_submitted_at')
    .maybeSingle();

  if (error) {
    console.error('appealsService: failed to submit appeal', error);
    throw error;
  }

  if (!data) {
    return { success: false, reason: 'not_found' as const };
  }

  const appealRecord = toAppealRecord(data);
  await notifyManagersOfAppeal(appealRecord);
  return { success: true };
}

export async function fetchAppealsForReview(): Promise<AppealRecord[]> {
  const { data, error } = await supabase
    .from('auto_removals')
    .select(
      'id, worker_id, project_id, removal_reason, metrics_snapshot, removed_at, appeal_status, appeal_message, appeal_submitted_at, appeal_decision_notes'
    )
    .eq('appeal_status', 'pending')
    .not('appeal_message', 'is', null)
    .order('appeal_submitted_at', { ascending: true });

  if (error) {
    console.warn('appealsService: failed to fetch appeals for review', error);
    return [];
  }

  return (data ?? []).map(toAppealRecord);
}

export async function reviewAppealDecision(input: ReviewAppealInput) {
  const decisionAt = new Date().toISOString();
  const payload = {
    appeal_status: input.decision,
    appeal_reviewed_by: input.reviewerId,
    appeal_decision_at: decisionAt,
    appeal_decision_notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from('auto_removals')
    .update(payload)
    .eq('id', input.removalId)
    .select('worker_id, project_id, appeal_status, appeal_decision_notes')
    .maybeSingle();

  if (error) {
    console.error('appealsService: failed to review appeal', error);
    throw error;
  }

  if (!data) {
    return { success: false, reason: 'not_found' as const };
  }

  await notifyWorkerOfDecision(data.worker_id, data.project_id, input.decision, input.notes);
  return { success: true };
}
