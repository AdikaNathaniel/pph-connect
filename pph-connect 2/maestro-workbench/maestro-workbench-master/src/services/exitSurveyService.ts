import { supabase } from '@/integrations/supabase/client';

export interface ExitSurveyInput {
  workerId: string;
  reason?: string;
  overallRating?: number | null;
  improvementSuggestions?: string;
  wouldRecommend?: boolean | null;
  additionalFeedback?: string;
}

export interface ExitSurveyResponse {
  id: string;
  workerId: string;
  reason?: string | null;
  overallRating?: number | null;
  improvementSuggestions?: string | null;
  wouldRecommend?: boolean | null;
  additionalFeedback?: string | null;
  submittedAt: string;
}

const normalizeRating = (value: number | null | undefined) => {
  if (typeof value !== 'number') return null;
  if (Number.isNaN(value)) return null;
  return Math.min(5, Math.max(1, Math.round(value)));
};

export async function submitExitSurvey(input: ExitSurveyInput) {
  if (!input.workerId) {
    return { success: false, reason: 'missing_worker' as const };
  }

  const payload = {
    worker_id: input.workerId,
    reason: input.reason ?? null,
    overall_rating: normalizeRating(input.overallRating ?? null),
    improvement_suggestions: input.improvementSuggestions ?? null,
    would_recommend: typeof input.wouldRecommend === 'boolean' ? input.wouldRecommend : null,
    additional_feedback: input.additionalFeedback ?? null,
  };

  const { error } = await supabase
    .from('worker_exit_surveys')
    .upsert(payload, { onConflict: 'worker_id' });

  if (error) {
    console.error('exitSurveyService: failed to submit survey', error);
    return { success: false, reason: 'error' as const };
  }

  return { success: true };
}

export async function fetchExitSurvey(workerId: string | null): Promise<ExitSurveyResponse | null> {
  if (!workerId) {
    return null;
  }

  const { data, error } = await supabase
    .from('worker_exit_surveys')
    .select('id, worker_id, reason, overall_rating, improvement_suggestions, would_recommend, additional_feedback, submitted_at')
    .eq('worker_id', workerId)
    .maybeSingle();

  if (error) {
    console.warn('exitSurveyService: failed to load survey', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    workerId: data.worker_id,
    reason: data.reason,
    overallRating: data.overall_rating,
    improvementSuggestions: data.improvement_suggestions,
    wouldRecommend: data.would_recommend,
    additionalFeedback: data.additional_feedback,
    submittedAt: data.submitted_at,
  };
}
