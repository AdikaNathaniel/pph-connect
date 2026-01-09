import { supabase } from '@/integrations/supabase/client';

export type OnboardingStatus = 'pending' | 'completed';

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  checklist: string[];
  status: OnboardingStatus;
  completedAt?: string | null;
};

export const WORKFLOW_STEPS: Array<OnboardingStep> = [
  {
    id: 'welcome_email',
    title: 'Welcome email',
    description: 'Confirm receipt of the welcome packet and next steps.',
    checklist: ['Read welcome note', 'Acknowledge participation'],
    status: 'pending',
  },
  {
    id: 'login_credentials',
    title: 'Login Credentials',
    description: 'Activate Supabase auth account and set a secure password.',
    checklist: ['Activate account link', 'Update password', 'Configure MFA'],
    status: 'pending',
  },
  {
    id: 'complete_profile',
    title: 'Complete Profile',
    description: 'Fill out personal details, emergency contacts, and payout info.',
    checklist: ['Personal details', 'Emergency contacts', 'Payment preference'],
    status: 'pending',
  },
  {
    id: 'platform_guidelines',
    title: 'Platform Guidelines',
    description: 'Review acceptable use policy and quality guidelines.',
    checklist: ['Acceptable use', 'Quality policy', 'Escalation protocol'],
    status: 'pending',
  },
  {
    id: 'orientation_quiz',
    title: 'Orientation Quiz',
    description: 'Validate retention of ramp-up material via short assessment.',
    checklist: ['Pass quiz', 'Review missed items'],
    status: 'pending',
  },
  {
    id: 'initial_training',
    title: 'Initial Training',
    description: 'Complete core workflow training modules assigned by ops.',
    checklist: ['Core workflow module', 'Accuracy module', 'Tooling walkthrough'],
    status: 'pending',
  },
  {
    id: 'beginner_assessments',
    title: 'Beginner Assessments',
    description: 'Demonstrate proficiency via managed tasks or sandbox runs.',
    checklist: ['Sandbox tasks', 'Manager approval'],
    status: 'pending',
  },
  {
    id: 'unlock_first_project',
    title: 'Unlock First Project',
    description: 'Obtain access to starter project or queue after readiness review.',
    checklist: ['Readiness review', 'Project assignment'],
    status: 'pending',
  },
];

const stepMap = new Map(WORKFLOW_STEPS.map((step) => [step.id, step]));

const normalizeStatus = (status?: string | null): OnboardingStatus =>
  status === 'completed' ? 'completed' : 'pending';

export async function getOnboardingProgress(workerId: string | null): Promise<OnboardingStep[]> {
  if (!workerId) {
    return WORKFLOW_STEPS.map((step) => ({ ...step }));
  }

  const { data, error } = await supabase
    .from('worker_onboarding_progress')
    .select('step_id, status, completed_at')
    .eq('worker_id', workerId);

  if (error) {
    console.warn('onboardingWorkflowService: failed to load worker progress', error);
    return WORKFLOW_STEPS.map((step) => ({ ...step }));
  }

  const statusMap = new Map(
    (data ?? []).map((row) => [row.step_id, { status: normalizeStatus(row.status), completedAt: row.completed_at }]),
  );

  return WORKFLOW_STEPS.map((step) => {
    const progress = statusMap.get(step.id);
    return {
      ...step,
      status: progress?.status ?? 'pending',
      completedAt: progress?.completedAt ?? null,
    };
  });
}

export async function completeOnboardingStep(workerId: string, stepId: string, metadata?: Record<string, unknown>) {
  if (!workerId || !stepMap.has(stepId)) {
    return { success: false, reason: 'invalid_input' as const };
  }

  const payload = {
    worker_id: workerId,
    step_id: stepId,
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: metadata ?? {},
  };

  const { error } = await supabase
    .from('worker_onboarding_progress')
    .upsert(payload, { onConflict: 'worker_id,step_id' });

  if (error) {
    console.error('onboardingWorkflowService: failed to complete step', error);
    return { success: false, reason: 'error' as const };
  }

  return { success: true };
}

export async function resetOnboardingStep(workerId: string, stepId: string) {
  if (!workerId || !stepMap.has(stepId)) {
    return { success: false, reason: 'invalid_input' as const };
  }

  const { error } = await supabase
    .from('worker_onboarding_progress')
    .upsert({
      worker_id: workerId,
      step_id: stepId,
      status: 'pending',
      completed_at: null,
      metadata: {},
    }, { onConflict: 'worker_id,step_id' });

  if (error) {
    console.error('onboardingWorkflowService: failed to reset step', error);
    return { success: false, reason: 'error' as const };
  }

  return { success: true };
}
