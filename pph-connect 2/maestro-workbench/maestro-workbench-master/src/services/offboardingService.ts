import { supabase } from '@/integrations/supabase/client';
import { checkRehireEligibility } from './rehireEligibilityService';
import { createInvoice } from '@/services/invoiceService';

export type OffboardingTriggerId = 'voluntary' | 'performance' | 'policy' | 'contract_end';

export interface OffboardingTrigger {
  id: OffboardingTriggerId;
  label: string;
  reason: string;
  rehireEligible: boolean;
  steps: OffboardingStepId[];
}

export type OffboardingStepId =
  | 'remove_assignments'
  | 'revoke_access'
  | 'generate_invoice'
  | 'process_payment'
  | 'exit_survey'
  | 'archive_worker'
  | 'update_rehire_status';

export interface OffboardingEvent {
  id: string;
  workerId: string;
  step: OffboardingStepId;
  status: 'pending' | 'completed';
  completedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

const DEFAULT_STEPS: OffboardingStepId[] = [
  'remove_assignments',
  'revoke_access',
  'generate_invoice',
  'process_payment',
  'exit_survey',
  'archive_worker',
  'update_rehire_status',
];

export const OFFBOARDING_TRIGGERS: OffboardingTrigger[] = [
  {
    id: 'voluntary',
    label: 'Voluntary Termination',
    reason: 'voluntary_departure',
    rehireEligible: true,
    steps: DEFAULT_STEPS,
  },
  {
    id: 'performance',
    label: 'Performance Removal',
    reason: 'performance_issue',
    rehireEligible: false,
    steps: DEFAULT_STEPS,
  },
  {
    id: 'policy',
    label: 'Policy Violation',
    reason: 'policy_violation',
    rehireEligible: false,
    steps: DEFAULT_STEPS,
  },
  {
    id: 'contract_end',
    label: 'Contract End',
    reason: 'contract_end',
    rehireEligible: true,
    steps: DEFAULT_STEPS,
  },
];

const findTrigger = (triggerId: OffboardingTriggerId) =>
  OFFBOARDING_TRIGGERS.find((trigger) => trigger.id === triggerId) ?? OFFBOARDING_TRIGGERS[0];

const today = () => new Date().toISOString().slice(0, 10);

const notifyWorker = async (workerId: string, message: string) => {
  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_ids: [workerId],
        subject: 'Offboarding in progress',
        content: message,
      },
    });
  } catch (error) {
    console.warn('offboardingService: failed to notify worker', error);
  }
};

const notifyManagers = async (workerId: string, trigger: OffboardingTrigger) => {
  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_roles: ['manager'],
        subject: `Offboarding started for ${workerId}`,
        content: `Worker ${workerId} entered ${trigger.label}.`,
      },
    });
  } catch (error) {
    console.warn('offboardingService: failed to notify managers', error);
  }
};

export async function triggerOffboarding(params: {
  workerId: string;
  triggerId: OffboardingTriggerId;
  notes?: string;
}) {
  const { workerId, triggerId, notes } = params;
  if (!workerId) {
    return { success: false, reason: 'missing_worker' as const };
  }

  const trigger = findTrigger(triggerId);

  const updatePayload = {
    status: 'terminated',
    termination_reason: trigger.reason,
    termination_notes: notes ?? null,
    rehire_eligible: trigger.rehireEligible,
    termination_date: today(),
  };

  const [workerUpdate, eventsInsert] = await Promise.all([
    supabase.from('workers').update(updatePayload).eq('id', workerId),
    supabase.from('offboarding_events').insert(
      trigger.steps.map((step) => ({
        worker_id: workerId,
        step,
        status: 'pending',
        metadata: { trigger: trigger.id },
      })),
    ),
  ]);

  if (workerUpdate.error || eventsInsert.error) {
    console.error('offboardingService: failed to start workflow', workerUpdate.error || eventsInsert.error);
    return { success: false, reason: 'error' as const };
  }

  await notifyWorker(
    workerId,
    'We received the offboarding request. Please monitor your email for remaining steps and exit tasks.',
  );
  await notifyManagers(workerId, trigger);

  return { success: true };
}

const removeAssignments = async (workerId: string) => {
  await supabase.from('worker_training_assignments').delete().eq('worker_id', workerId);
  await supabase.from('worker_training_access').delete().eq('worker_id', workerId);
  await supabase.from('worker_assignments').update({ removed_at: new Date().toISOString() }).eq('worker_id', workerId);
};

const revokeAccess = async (workerId: string) => {
  await supabase
    .from('worker_accounts')
    .update({
      status: 'inactive',
      is_current: false,
      deactivated_at: new Date().toISOString(),
      deactivation_reason: 'offboarding',
    })
    .eq('worker_id', workerId);
  await supabase.from('worker_training_access').delete().eq('worker_id', workerId);
};

const generateInvoice = async (workerId: string) => {
  const todayDate = new Date();
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - 14);
  const toDate = todayDate.toISOString().slice(0, 10);
  const fromDate = startDate.toISOString().slice(0, 10);

  const result = await createInvoice({
    workerId,
    periodStart: fromDate,
    periodEnd: toDate,
    status: 'draft',
  });

  return result.invoiceId;
};

const markInvoicePaid = async (workerId: string) => {
  const { data } = await supabase
    .from('invoices')
    .select('id')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    return null;
  }

  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      approved_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return data.id;
};

const collectExitSurvey = async (workerId: string, surveyResponses?: Record<string, unknown>) => {
  await logEventCompletion(workerId, 'exit_survey', { survey: surveyResponses ?? {} });
};

const archiveWorkerSnapshot = async (workerId: string) => {
  const { data } = await supabase
    .from('workers')
    .select('id, full_name, email_personal, email_pph, country_residence, locale_primary')
    .eq('id', workerId)
    .maybeSingle();
  return data ?? null;
};

const updateRehireEligibility = async (workerId: string) => {
  await checkRehireEligibility(workerId);
};

const logEventCompletion = async (workerId: string, step: OffboardingStepId, metadata?: Record<string, unknown>) => {
  await supabase
    .from('offboarding_events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata,
    })
    .eq('worker_id', workerId)
    .eq('step', step);
};

export async function processOffboardingStep(params: {
  workerId: string;
  step: OffboardingStepId;
  metadata?: Record<string, unknown>;
}) {
  const { workerId, step, metadata } = params;
  if (!workerId) {
    return { success: false, reason: 'missing_worker' as const };
  }

  try {
    let eventMetadata = metadata ?? {};
    switch (step) {
      case 'remove_assignments':
        await removeAssignments(workerId);
        break;
      case 'revoke_access':
        await revokeAccess(workerId);
        break;
      case 'generate_invoice':
        eventMetadata = { ...eventMetadata, invoiceId: await generateInvoice(workerId) };
        break;
      case 'process_payment':
        eventMetadata = { ...eventMetadata, invoiceId: await markInvoicePaid(workerId) };
        break;
      case 'exit_survey':
        await collectExitSurvey(workerId, metadata ?? {});
        return { success: true };
      case 'archive_worker':
        eventMetadata = { ...eventMetadata, snapshot: await archiveWorkerSnapshot(workerId) };
        break;
      case 'update_rehire_status':
        await updateRehireEligibility(workerId);
        break;
      default:
        break;
    }

    await logEventCompletion(workerId, step, eventMetadata);
    return { success: true };
  } catch (error) {
    console.error('offboardingService: failed to process step', error);
    return { success: false, reason: 'error' as const };
  }
}

export async function fetchOffboardingStatus(workerId: string | null): Promise<OffboardingEvent[]> {
  if (!workerId) return [];
  const { data, error } = await supabase
    .from('offboarding_events')
    .select('id, worker_id, step, status, completed_at, metadata')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('offboardingService: failed to load status', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    workerId: row.worker_id,
    step: row.step as OffboardingStepId,
    status: row.status as 'pending' | 'completed',
    completedAt: row.completed_at,
    metadata: row.metadata as Record<string, unknown> | null,
  }));
}
