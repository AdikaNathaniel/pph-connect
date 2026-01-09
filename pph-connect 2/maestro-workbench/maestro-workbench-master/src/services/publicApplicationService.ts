import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

export type PublicApplicationPayload = {
  fullName: string;
  email: string;
  country: string;
  primaryLanguage: string;
  languages: string[];
  education?: string;
  domains: string[];
  resumeFileName?: string;
  coverLetter: string;
  referralSource?: string;
};

export async function notifyAdminsOfPublicApplication(payload: PublicApplicationPayload) {
  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_roles: ['admin'],
        subject: `New application from ${payload.fullName}`,
        content: `An applicant submitted the public form.\n\nEmail: ${payload.email}\nCountry: ${payload.country}\nPrimary language: ${payload.primaryLanguage}\nDomains: ${payload.domains.join(', ') || 'Not specified'}`,
      },
    });
  } catch (error) {
    console.warn('publicApplicationService: failed to notify admins', error);
  }
}

export async function submitPublicApplication(payload: PublicApplicationPayload) {
  const { error } = await supabase.from('applications').insert({
    status: 'pending',
    source: 'public_form',
    applicant_email: payload.email,
    applicant_name: payload.fullName,
    application_data: payload,
  });

  if (error) {
    throw new Error(`Failed to submit application: ${normalizeError(error)}`);
  }

  await notifyAdminsOfPublicApplication(payload);
}
