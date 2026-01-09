import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

export type ApplicationApprovalInput = {
  applicationId: string;
  applicant: {
    fullName: string;
    email: string;
    country?: string;
    primaryLanguage?: string;
  };
};

export async function approveApplication(input: ApplicationApprovalInput) {
  const { applicationId, applicant } = input;

  const workerInsert = supabase.from('workers').insert({
    full_name: applicant.fullName,
    email_personal: applicant.email,
    country: applicant.country ?? null,
    preferred_language: applicant.primaryLanguage ?? null,
    status: 'pending',
  });

  const applicationUpdate = supabase
    .from('applications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  const onboardingLog = supabase.from('onboarding_events').insert([
    {
      application_id: applicationId,
      event_type: 'welcome_email_sent',
      metadata: { email: applicant.email },
    },
    {
      application_id: applicationId,
      event_type: 'credentials_provisioned',
      metadata: { email: applicant.email },
    },
    {
      application_id: applicationId,
      event_type: 'training_assigned',
      metadata: { modules: ['core-onboarding'] },
    },
  ]);

  const [{ error: workerError }, { error: applicationError }, { error: onboardingError }] = await Promise.all([
    workerInsert,
    applicationUpdate,
    onboardingLog,
  ]);

  if (workerError) {
    throw new Error(`Failed to create worker: ${normalizeError(workerError)}`);
  }
  if (applicationError) {
    throw new Error(`Failed to update application status: ${normalizeError(applicationError)}`);
  }
  if (onboardingError) {
    console.warn('applicationApprovalService: onboarding log failed', onboardingError);
  }
}
