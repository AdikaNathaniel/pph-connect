import { supabase } from '@/integrations/supabase/client';
import type { GradedQuestionResult } from '@/services/assessmentGradingService';

export interface AssessmentQuestionDraft {
  id: string;
  prompt: string;
  type: string;
  options: string[];
  correctIndex: number;
  instructions?: string;
}

export interface AssessmentDraft {
  name: string;
  category: string;
  passingScore: number;
  questions: AssessmentQuestionDraft[];
}

export interface AssessmentDefinition {
  id: string;
  name: string;
  category: string;
  passingScore: number;
  metadata: Record<string, unknown>;
}

export interface AssessmentResultSubmission {
  workerId: string;
  assessmentId: string;
  assessmentName: string;
  assessmentType: string;
  score: number;
  passed: boolean;
  responses: Record<string, string>;
  breakdown: GradedQuestionResult[];
}

export interface ManualGradeSubmission {
  recordId: string;
  workerId: string;
  score: number;
  passed: boolean;
  feedback: string;
  reviewerId?: string | null;
}

export async function createAssessmentDefinition(draft: AssessmentDraft): Promise<void> {
  const payload = {
    worker_id: null,
    skill_name: draft.name,
    assessment_type: draft.category || 'general',
    score: draft.passingScore,
    passed: false,
    metadata: {
      questions: draft.questions,
    },
  };

  const { error } = await supabase.from('skill_assessments').insert(payload);
  if (error) {
    throw error;
  }
}

export async function listAssessmentDefinitions(): Promise<AssessmentDefinition[]> {
  const { data, error } = await supabase
    .from('skill_assessments')
    .select('id, skill_name, assessment_type, score, metadata')
    .is('worker_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('assessmentService: failed to list definitions', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.skill_name,
    category: row.assessment_type,
    passingScore: Number(row.score ?? 0),
    metadata: row.metadata ?? {},
  }));
}

export async function recordAssessmentResult(submission: AssessmentResultSubmission): Promise<void> {
  if (!submission.workerId) {
    throw new Error('recordAssessmentResult requires a workerId');
  }

  const payload = {
    worker_id: submission.workerId,
    skill_name: submission.assessmentName,
    assessment_type: submission.assessmentType || 'general',
    score: submission.score,
    passed: submission.passed,
    metadata: {
      assessmentId: submission.assessmentId,
      responses: submission.responses,
      breakdown: submission.breakdown,
      autoGraded: true,
    },
  };

  const { error } = await supabase.from('skill_assessments').insert(payload);
  if (error) {
    throw error;
  }
}

export async function submitManualGrade(submission: ManualGradeSubmission): Promise<void> {
  if (!submission.recordId || !submission.workerId) {
    throw new Error('submitManualGrade requires recordId and workerId');
  }

  const payload = {
    score: submission.score,
    passed: submission.passed,
    metadata: {
      feedback: submission.feedback,
      reviewerId: submission.reviewerId ?? null,
      gradedAt: new Date().toISOString(),
      manualReview: true,
    },
  };

  const { error } = await supabase
    .from('skill_assessments')
    .update(payload)
    .eq('id', submission.recordId)
    .eq('worker_id', submission.workerId);

  if (error) {
    throw error;
  }
}
