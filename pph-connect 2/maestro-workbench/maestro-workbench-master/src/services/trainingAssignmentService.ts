import { supabase } from '@/integrations/supabase/client';
import { completeOnboardingStep } from '@/services/onboardingWorkflowService';

type TrainingModuleRow = {
  id: string;
  title: string;
  description?: string | null;
  domain_tags?: string[] | null;
};

export type TrainingAssignmentStatus = 'pending' | 'completed';

export interface TrainingAssignment {
  id: string;
  trainingModuleId: string;
  title: string;
  description?: string | null;
  status: TrainingAssignmentStatus;
  autoAssigned: boolean;
  assignedAt: string;
  completedAt?: string | null;
  domainTags: string[];
}

const normalizeTag = (tag: string | null | undefined) => (tag ?? '').trim().toLowerCase();

const normalizeList = (values: (string | null | undefined)[] | null | undefined) =>
  (values ?? [])
    .map(normalizeTag)
    .filter((value): value is string => Boolean(value));

const fetchWorkerDomains = async (workerId: string) => {
  const { data, error } = await supabase
    .from('worker_skills')
    .select('skill_category')
    .eq('worker_id', workerId);

  if (error) {
    console.warn('trainingAssignmentService: failed to fetch worker skills', error);
    return [];
  }

  const categories = (data ?? []).map((row) => normalizeTag(row.skill_category as string));
  return Array.from(new Set(categories));
};

const notifyWorker = async (workerId: string, titles: string[]) => {
  if (!titles.length) return;
  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_ids: [workerId],
        subject: 'New training modules assigned',
        content: [
          'Hi there,',
          '',
          'We assigned new training modules based on your domain skills:',
          ...titles.map((title, index) => `${index + 1}. ${title}`),
          '',
          'Complete them to unlock more projects. Thanks!',
        ].join('\n'),
      },
    });
  } catch (error) {
    console.warn('trainingAssignmentService: failed to notify worker', error);
  }
};

export async function assignTrainingForWorker(workerId: string | null) {
  if (!workerId) {
    return { assigned: [] as TrainingAssignment[] };
  }

  const domains = await fetchWorkerDomains(workerId);
  if (!domains.length) {
    return { assigned: [] as TrainingAssignment[] };
  }

  const [{ data: modules, error: moduleError }, { data: existingAssignments, error: assignmentError }] = await Promise.all([
    supabase.from('training_modules').select('id, title, description, domain_tags'),
    supabase
      .from('worker_training_assignments')
      .select('training_module_id')
      .eq('worker_id', workerId),
  ]);

  if (moduleError) {
    console.warn('trainingAssignmentService: failed to load training modules', moduleError);
    return { assigned: [] as TrainingAssignment[] };
  }
  if (assignmentError) {
    console.warn('trainingAssignmentService: failed to load assignments', assignmentError);
    return { assigned: [] as TrainingAssignment[] };
  }

  const existingIds = new Set((existingAssignments ?? []).map((row) => row.training_module_id));

  const normalizedDomains = new Set(domains);
  const candidateModules = (modules ?? []).filter((module) => {
    const tags = normalizeList(module.domain_tags ?? []);
    if (!tags.length) return false;
    return tags.some((tag) => normalizedDomains.has(tag));
  });

  const modulesToAssign = candidateModules.filter((module) => !existingIds.has(module.id));

  if (!modulesToAssign.length) {
    return { assigned: [] as TrainingAssignment[] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('worker_training_assignments')
    .insert(
      modulesToAssign.map((module) => ({
        worker_id: workerId,
        training_module_id: module.id,
        status: 'pending',
        auto_assigned: true,
        metadata: { reason: 'domain_auto_assign' },
      })),
    )
    .select('id, training_module_id, status, auto_assigned, assigned_at, completed_at');

  if (insertError) {
    console.error('trainingAssignmentService: failed to assign modules', insertError);
    throw insertError;
  }

  await notifyWorker(workerId, modulesToAssign.map((module) => module.title ?? 'Training module'));

  const assigned: TrainingAssignment[] = (inserted ?? []).map((row) => {
    const module = modulesToAssign.find((module) => module.id === row.training_module_id);
    return {
      id: row.id,
      trainingModuleId: row.training_module_id,
      title: module?.title ?? 'Training module',
      description: module?.description ?? null,
      status: row.status as TrainingAssignmentStatus,
      autoAssigned: Boolean(row.auto_assigned),
      assignedAt: row.assigned_at,
      completedAt: row.completed_at,
      domainTags: normalizeList(module?.domain_tags ?? []),
    };
  });

  return { assigned };
}

export async function fetchTrainingAssignments(workerId: string | null): Promise<TrainingAssignment[]> {
  if (!workerId) return [];

  const { data, error } = await supabase
    .from('worker_training_assignments')
    .select(
      `
        id,
        training_module_id,
        status,
        auto_assigned,
        assigned_at,
        completed_at,
        training_module:training_modules(id, title, description, domain_tags)
      `,
    )
    .eq('worker_id', workerId)
    .order('assigned_at', { ascending: false });

  if (error) {
    console.warn('trainingAssignmentService: failed to fetch assignments', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    trainingModuleId: row.training_module_id,
    title: row.training_module?.title ?? 'Training module',
    description: row.training_module?.description ?? null,
    status: row.status as TrainingAssignmentStatus,
    autoAssigned: Boolean(row.auto_assigned),
    assignedAt: row.assigned_at,
    completedAt: row.completed_at,
    domainTags: normalizeList(row.training_module?.domain_tags ?? []),
  }));
}

export async function markTrainingCompleted(workerId: string | null, assignmentId: string) {
  if (!workerId) {
    return { success: false, reason: 'unauthenticated' as const };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('worker_training_assignments')
    .update({ status: 'completed', completed_at: completedAt })
    .eq('id', assignmentId)
    .eq('worker_id', workerId)
    .select('training_module_id')
    .maybeSingle();

  if (error || !data) {
    console.warn('trainingAssignmentService: failed to complete assignment', error);
    return { success: false, reason: 'not_found' as const };
  }

  await supabase
    .from('worker_training_completions')
    .insert({
      worker_id: workerId,
      training_module_id: data.training_module_id,
      completed_at: completedAt,
    })
    .catch((completionError) => {
      console.warn('trainingAssignmentService: failed to log completion', completionError);
    });

  // If every assignment is now complete, mark onboarding step complete.
  const { data: remaining } = await supabase
    .from('worker_training_assignments')
    .select('id')
    .eq('worker_id', workerId)
    .neq('status', 'completed')
    .limit(1);

  if (!remaining?.length) {
    await completeOnboardingStep(workerId, 'initial_training').catch(() => {});
  }

  return { success: true };
}
