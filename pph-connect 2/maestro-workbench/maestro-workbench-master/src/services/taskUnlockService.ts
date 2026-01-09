import { supabase } from '@/integrations/supabase/client';
import {
  COMPLETION_THRESHOLDS,
  DEFAULT_UNLOCK_METRICS,
  DIFFICULTY_ORDER,
  DOMAIN_ASSESSMENT_REQUIRED,
  QUALITY_SCORE_REQUIREMENTS,
  TRAINING_GATE_REQUIRED,
  type DifficultyLevel,
  evaluateDifficultyCriteria,
  getUnlockedDifficulties as computeUnlockedLevels,
  type UnlockMetrics,
} from '@/lib/taskUnlocking';

interface UnlockCriteriaResult {
  difficulty: DifficultyLevel;
  eligible: boolean;
  missingReasons: string[];
  metrics: UnlockMetrics;
}

interface UnlockState {
  metrics: UnlockMetrics;
  manualUnlocks: DifficultyLevel[];
}

export interface UnlockProgress {
  unlockedLevels: DifficultyLevel[];
  nextLevel: DifficultyLevel | null;
  completionPercent: number;
  remainingTasks: number | null;
  requirements: {
    completedTasks: number;
    targetTasks: number | null;
    qualityScore: number | null;
    requiredQualityScore: number | null;
    trainingGateRequired: boolean;
    trainingGatePassed: boolean;
    domainAssessmentRequired: boolean;
    domainAssessmentPassed: boolean;
  };
}

const normalizeNumber = (value: number | null | undefined) => (Number.isFinite(value) ? Number(value) : 0);
const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const mergeUnlockedLevels = (metrics: UnlockMetrics, manualUnlocks: DifficultyLevel[]) => {
  const computed = new Set<DifficultyLevel>(computeUnlockedLevels(metrics));
  manualUnlocks.forEach((level) => computed.add(level));
  return DIFFICULTY_ORDER.filter((level) => computed.has(level));
};

const fetchUnlockState = async (workerId: string | null | undefined): Promise<UnlockState> => {
  if (!workerId) {
    return {
      metrics: DEFAULT_UNLOCK_METRICS,
      manualUnlocks: [],
    };
  }

  const [
    { data: workStats },
    { data: qualityMetrics },
    { data: gateRows },
    { data: assessments },
    { data: manualUnlockRows },
  ] = await Promise.all([
    supabase.from('work_stats').select('units_completed').eq('worker_id', workerId),
    supabase
      .from('quality_metrics')
      .select('metric_value')
      .eq('worker_id', workerId)
      .eq('metric_type', 'quality')
      .order('measured_at', { ascending: false })
      .limit(1),
    supabase.from('training_gates').select('status').eq('worker_id', workerId),
    supabase.from('skill_assessments').select('passed').eq('worker_id', workerId),
    supabase.from('worker_unlocks').select('difficulty_level').eq('worker_id', workerId),
  ]);

  const completedTasks = (workStats ?? []).reduce((sum, row) => sum + normalizeNumber(row.units_completed), 0);
  const qualityScore = normalizeNumber(qualityMetrics?.[0]?.metric_value ?? null) || null;
  const trainingGatesPassed =
    (gateRows ?? []).length > 0 && (gateRows ?? []).every((row) => (row.status ?? '').toLowerCase() === 'passed');
  const domainAssessmentsPassed = (assessments ?? []).some((row) => Boolean(row.passed));
  const manualUnlocks = (manualUnlockRows ?? [])
    .map((row) => (row.difficulty_level as DifficultyLevel) ?? null)
    .filter((level): level is DifficultyLevel => level != null);

  return {
    metrics: {
      completedTasks,
      qualityScore,
      trainingGatesPassed,
      domainAssessmentsPassed,
    },
    manualUnlocks,
  };
};

export const getUnlockProgress = async (workerId: string | null | undefined): Promise<UnlockProgress> => {
  const { metrics, manualUnlocks } = await fetchUnlockState(workerId);
  const unlockedLevels = mergeUnlockedLevels(metrics, manualUnlocks);
  const nextLevel = DIFFICULTY_ORDER.find((level) => !unlockedLevels.includes(level)) ?? null;
  const currentLevel = unlockedLevels[unlockedLevels.length - 1] ?? 'beginner';
  const previousThreshold = COMPLETION_THRESHOLDS[currentLevel];
  const targetTasks = nextLevel ? COMPLETION_THRESHOLDS[nextLevel] : previousThreshold;
  const completionPercent = nextLevel
    ? clampPercent(((metrics.completedTasks - previousThreshold) / Math.max(1, targetTasks - previousThreshold)) * 100)
    : 100;
  const remainingTasks = nextLevel ? Math.max(0, targetTasks - metrics.completedTasks) : null;

  return {
    unlockedLevels,
    nextLevel,
    completionPercent,
    remainingTasks,
    requirements: {
      completedTasks: metrics.completedTasks,
      targetTasks: nextLevel ? targetTasks : null,
      qualityScore: metrics.qualityScore,
      requiredQualityScore: nextLevel ? QUALITY_SCORE_REQUIREMENTS[nextLevel] : null,
      trainingGateRequired: Boolean(nextLevel && TRAINING_GATE_REQUIRED[nextLevel]),
      trainingGatePassed: metrics.trainingGatesPassed,
      domainAssessmentRequired: Boolean(nextLevel && DOMAIN_ASSESSMENT_REQUIRED[nextLevel]),
      domainAssessmentPassed: metrics.domainAssessmentsPassed,
    },
  };
};

export const getUnlockedDifficulties = async (workerId: string | null | undefined): Promise<DifficultyLevel[]> => {
  const { metrics, manualUnlocks } = await fetchUnlockState(workerId);
  return mergeUnlockedLevels(metrics, manualUnlocks);
};

export const checkUnlockCriteria = async (
  workerId: string | null | undefined,
  difficulty: DifficultyLevel
): Promise<UnlockCriteriaResult> => {
  const { metrics } = await fetchUnlockState(workerId);
  const evaluation = evaluateDifficultyCriteria(difficulty, metrics);
  return {
    ...evaluation,
    metrics,
  };
};

export const unlockDifficulty = async (
  workerId: string,
  difficulty: DifficultyLevel,
  source: string = 'manager'
): Promise<void> => {
  if (!workerId) {
    throw new Error('unlockDifficulty requires workerId');
  }

  const { data, error } = await supabase
    .from('worker_unlocks')
    .select('id')
    .eq('worker_id', workerId)
    .eq('difficulty_level', difficulty)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase.from('worker_unlocks').insert({
      worker_id: workerId,
      difficulty_level: difficulty,
      source,
    });
    if (insertError) {
      throw insertError;
    }
  }
};
