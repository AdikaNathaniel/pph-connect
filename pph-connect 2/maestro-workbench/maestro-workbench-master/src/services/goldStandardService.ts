import { supabase } from '@/integrations/supabase/client';

export interface GoldStandardQuestion {
  id: string;
  questionIdentifier: string;
  rowIndex: number;
  isGoldStandard: boolean;
  correctAnswer: Record<string, unknown> | null;
  prompt: string;
  updatedAt: string | null;
}

export interface GoldStandardSummary {
  projectId: string | null;
  distributionTarget: number;
  questions: GoldStandardQuestion[];
  totalQuestions: number;
  totalGoldQuestions: number;
}

export interface GoldStandardUpdateInput {
  questionId: string;
  isGoldStandard: boolean;
  correctAnswer?: Record<string, unknown> | null;
}

export interface CreateGoldStandardInput {
  projectId: string;
  prompt: string;
  correctAnswer: Record<string, unknown>;
  questionIdentifier?: string;
  rowIndex?: number;
}

const DEFAULT_SUMMARY: GoldStandardSummary = {
  projectId: null,
  distributionTarget: 10,
  questions: [],
  totalQuestions: 0,
  totalGoldQuestions: 0,
};

const GOLD_DISTRIBUTION_METRIC = 'gold_distribution';

const safeJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export async function fetchGoldStandardQuestions(projectId: string | null): Promise<GoldStandardSummary> {
  if (!projectId) {
    return DEFAULT_SUMMARY;
  }

  const [{ data: questions, error: questionError }, { data: distributionRow, error: distributionError }] =
    await Promise.all([
      supabase
        .from('questions')
        .select('id, question_id, row_index, data, is_gold_standard, correct_answer, updated_at')
        .eq('project_id', projectId)
        .order('row_index', { ascending: true }),
      supabase
        .from('performance_thresholds')
        .select('id, threshold_min')
        .eq('project_id', projectId)
        .eq('metric_type', GOLD_DISTRIBUTION_METRIC)
        .maybeSingle(),
    ]);

  if (questionError) {
    console.warn('goldStandardService: failed to load questions', questionError);
    return DEFAULT_SUMMARY;
  }

  if (distributionError) {
    console.warn('goldStandardService: failed to load distribution target', distributionError);
  }

  const mappedQuestions: GoldStandardQuestion[] = (questions ?? []).map((row) => {
    const promptField =
      (typeof row.data?.prompt === 'string' && row.data.prompt) ||
      (typeof row.data?.text === 'string' && row.data.text) ||
      'Gold standard question';
    return {
      id: row.id,
      questionIdentifier: row.question_id,
      rowIndex: row.row_index ?? 0,
      isGoldStandard: Boolean(row.is_gold_standard),
      correctAnswer: row.correct_answer as Record<string, unknown> | null,
      prompt: promptField,
      updatedAt: row.updated_at ?? null,
    };
  });

  return {
    projectId,
    questions: mappedQuestions,
    totalQuestions: mappedQuestions.length,
    totalGoldQuestions: mappedQuestions.filter((question) => question.isGoldStandard).length,
    distributionTarget:
      typeof distributionRow?.threshold_min === 'number' ? Number(distributionRow.threshold_min) : DEFAULT_SUMMARY.distributionTarget,
  };
}

export async function bulkUpdateGoldStandards(projectId: string, updates: GoldStandardUpdateInput[]) {
  if (!projectId || !updates.length) {
    return { success: true };
  }

  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from('questions')
        .update({
          is_gold_standard: update.isGoldStandard,
          correct_answer: update.correctAnswer ?? null,
        })
        .eq('id', update.questionId)
        .eq('project_id', projectId)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error('goldStandardService: failed to update questions', failed.error);
    throw failed.error;
  }

  return { success: true };
}

export async function createGoldStandardQuestion(input: CreateGoldStandardInput) {
  if (!input.projectId) {
    throw new Error('projectId is required');
  }

  const identifier =
    input.questionIdentifier?.trim() || `gs_${generateIdentifier().replace(/-/g, '').slice(0, 12)}`;
  const rowIndex = typeof input.rowIndex === 'number' ? input.rowIndex : Date.now();

  const payload = {
    project_id: input.projectId,
    question_id: identifier,
    row_index: rowIndex,
    data: {
      prompt: input.prompt,
      type: 'gold_standard',
      expected_answer: input.correctAnswer,
    },
    required_replications: 1,
    completed_replications: 0,
    is_answered: false,
    is_gold_standard: true,
    correct_answer: input.correctAnswer,
  };

  const { error } = await supabase.from('questions').insert(payload);

  if (error) {
    console.error('goldStandardService: failed to create question', error);
    throw error;
  }

  return { success: true };
}

export async function updateGoldDistributionTarget(projectId: string, percent: number) {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const normalized = Math.max(0, Math.min(100, Math.round(percent * 10) / 10));

  const { data, error } = await supabase
    .from('performance_thresholds')
    .select('id')
    .eq('project_id', projectId)
    .eq('metric_type', GOLD_DISTRIBUTION_METRIC)
    .maybeSingle();

  if (error) {
    console.warn('goldStandardService: failed to look up distribution target', error);
  }

  if (data?.id) {
    const { error: updateError } = await supabase
      .from('performance_thresholds')
      .update({
        threshold_min: normalized,
        threshold_max: normalized,
        action_on_violation: 'warn',
        grace_period_days: 0,
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('goldStandardService: failed to update distribution target', updateError);
      throw updateError;
    }
    return { success: true };
  }

  const { error: insertError } = await supabase.from('performance_thresholds').insert({
    project_id: projectId,
    metric_type: GOLD_DISTRIBUTION_METRIC,
    threshold_min: normalized,
    threshold_max: normalized,
    grace_period_days: 0,
    action_on_violation: 'warn',
  });

  if (insertError) {
    console.error('goldStandardService: failed to insert distribution target', insertError);
    throw insertError;
  }

  return { success: true };
}
const generateIdentifier = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
};
