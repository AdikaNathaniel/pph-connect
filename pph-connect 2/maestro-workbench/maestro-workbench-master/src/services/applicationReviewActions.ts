import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

export async function scheduleAiInterview(applicationId: string) {
  const { error } = await supabase
    .from('applications')
    .update({
      status: 'reviewing',
      interview_scheduled_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    throw new Error(`Failed to schedule AI interview: ${normalizeError(error)}`);
  }
}

export async function requestAdditionalInfo(applicationId: string) {
  const { error } = await supabase
    .from('applications')
    .update({
      status: 'reviewing',
      additional_info_requested_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    throw new Error(`Failed to request additional info: ${normalizeError(error)}`);
  }
}

export async function rejectWithReason(applicationId: string, reason: string | null) {
  const { error } = await supabase
    .from('applications')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq('id', applicationId);

  if (error) {
    throw new Error(`Failed to reject application: ${normalizeError(error)}`);
  }
}
