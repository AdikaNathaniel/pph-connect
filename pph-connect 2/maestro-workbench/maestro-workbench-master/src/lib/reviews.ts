import { supabase } from '@/integrations/supabase/client';
import { ReviewTask } from '@/types';

export interface ClaimReviewTaskParams {
  projectId: string;
  workerId: string;
}

export async function claimNextReviewTask({
  projectId,
  workerId,
}: ClaimReviewTaskParams): Promise<ReviewTask | null> {
  const { data, error } = await supabase.rpc('claim_next_review_task', {
    p_project_id: projectId,
    p_worker_id: workerId,
  });

  if (error) {
    throw error;
  }

  const rows = (data as any[]) ?? [];
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] ?? rows;

  return {
    review_task_id: row.review_task_id ?? row.id,
    project_id: row.project_id,
    question_uuid: row.question_uuid,
    answer_uuid: row.answer_uuid,
    status: row.status,
    question_id: row.question_id,
    question_data: row.question_data ?? {},
    answer_data: row.answer_data ?? {},
    answer_id: row.answer_id ?? '',
    transcriber_uuid: row.transcriber_uuid ?? null,
  };
}

export interface SubmitReviewInput {
  reviewTaskId: string;
  reviewerId: string;
  ratingOverall: number;
  highlightTags: string[];
  feedbackToTranscriber?: string;
  internalNotes?: string;
  reviewPayload: Record<string, unknown>;
}

export async function submitReview({
  reviewTaskId,
  reviewerId,
  ratingOverall,
  highlightTags,
  feedbackToTranscriber,
  internalNotes,
  reviewPayload,
}: SubmitReviewInput) {
  const { data, error } = await supabase.rpc('submit_review', {
    p_review_task_id: reviewTaskId,
    p_reviewer_id: reviewerId,
    p_rating_overall: ratingOverall,
    p_highlight_tags: highlightTags,
    p_feedback: feedbackToTranscriber ?? null,
    p_internal_notes: internalNotes ?? null,
    p_review_payload: reviewPayload,
  });

  if (error) {
    throw error;
  }

  const result = (data as any[] | null)?.[0] ?? data;

  return result
    ? {
        review_submission_uuid: result.review_submission_uuid,
        review_id: result.review_id,
        final_answer_uuid: result.final_answer_uuid,
        final_answer_id: result.final_answer_id,
        qc_record_uuid: result.qc_record_uuid,
        qc_id: result.qc_id,
      }
    : null;
}

export async function releaseReviewTask(reviewTaskId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('release_review_task', {
    p_review_task_id: reviewTaskId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}
