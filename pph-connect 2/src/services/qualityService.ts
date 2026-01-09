import { supabase } from '@/integrations/supabase/client';

export type QualityScoreResult = {
  projectId: string | null;
  workerId: string;
  compositeScore: number | null;
  goldStandardAccuracy: number | null;
  interAnnotatorAgreement: number | null;
};

const defaultResult = (workerId: string, projectId: string | null): QualityScoreResult => ({
  projectId,
  workerId,
  compositeScore: null,
  goldStandardAccuracy: null,
  interAnnotatorAgreement: null
});

export async function calculateWorkerQualityScore(workerId: string, projectId: string | null): Promise<QualityScoreResult> {
  if (!workerId) {
    return defaultResult(workerId, projectId);
  }
  const accuracy = await getGoldStandardAccuracy(workerId, projectId);
  const agreement = projectId ? await getInterAnnotatorAgreementByProject(projectId) : null;
  const composite = [accuracy, agreement].filter((score) => typeof score === 'number') as number[];
  const compositeScore = composite.length ? composite.reduce((sum, value) => sum + value, 0) / composite.length : null;
  return {
    projectId: projectId ?? null,
    workerId,
    compositeScore,
    goldStandardAccuracy: accuracy,
    interAnnotatorAgreement: agreement
  };
}

export async function getGoldStandardAccuracy(workerId: string, projectId: string | null): Promise<number | null> {
  if (!workerId) {
    return null;
  }
  const { data, error } = await supabase.rpc('calculate_gold_standard_accuracy', {
    p_worker_id: workerId,
    p_project_id: projectId
  });
  if (error) {
    console.warn('getGoldStandardAccuracy: fallback to null', error);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

export async function getInterAnnotatorAgreement(taskId: string): Promise<number | null> {
  if (!taskId) {
    return null;
  }
  const { data, error } = await supabase.rpc('calculate_task_iaa', {
    p_task_id: taskId
  });
  if (error) {
    console.warn('getInterAnnotatorAgreement: fallback to null', error);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

export async function getInterAnnotatorAgreementByProject(projectId: string): Promise<number | null> {
  if (!projectId) {
    return null;
  }
  const { data, error } = await supabase.rpc('calculate_project_iaa', {
    p_project_id: projectId
  });
  if (error) {
    console.warn('getInterAnnotatorAgreementByProject: fallback to null', error);
    return null;
  }
  return typeof data === 'number' ? data : null;
}

export async function updateWorkerTrustRating(workerId: string): Promise<number | null> {
  if (!workerId) {
    return null;
  }
  const { data, error } = await supabase.rpc('update_worker_trust_rating', {
    p_worker_id: workerId
  });
  if (error) {
    console.warn('updateWorkerTrustRating: fallback to null', error);
    return null;
  }
  return typeof data === 'number' ? data : null;
}
