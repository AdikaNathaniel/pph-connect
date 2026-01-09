import { supabase } from '@/integrations/supabase/client';

interface SaveInterviewResultInput {
  workerId: string;
  domain: string;
  questions: unknown[];
  answers: unknown[];
  transcript: string;
  score: number;
  confidence: number;
  skillVerificationId?: string | null;
  conductedAt?: string;
}

export async function saveInterviewResult(input: SaveInterviewResultInput) {
  const {
    workerId,
    domain,
    questions,
    answers,
    transcript,
    score,
    confidence,
    skillVerificationId,
    conductedAt,
  } = input;

  const payload = {
    worker_id: workerId,
    domain,
    questions_asked: questions,
    answers_given: answers,
    transcript,
    score,
    confidence,
    skill_verification_id: skillVerificationId ?? null,
    conducted_at: conductedAt ?? new Date().toISOString(),
  };

  const { data: interviewRows, error } = await supabase
    .from('ai_interviews')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  let verificationId = skillVerificationId ?? null;
  if (!verificationId) {
    const { data: verificationRow, error: verificationError } = await supabase
      .from('skill_verifications')
      .insert({
        worker_id: workerId,
        skill_name: domain,
        verification_type: 'ai_interview',
        verification_data: {
          transcriptLength: transcript.length,
          prompts: questions,
          answers,
        },
        confidence_score: confidence,
      })
      .select('id')
      .single();
    if (verificationError) {
      console.warn('interviewStorageService: unable to create skill verification', verificationError);
    } else {
      verificationId = verificationRow?.id ?? null;
    }
  }

  if (verificationId && interviewRows?.id) {
    await supabase
      .from('ai_interviews')
      .update({ skill_verification_id: verificationId })
      .eq('id', interviewRows.id);
  }
}
