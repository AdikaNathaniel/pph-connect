export const DIFFICULTY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type DifficultyLevel = (typeof DIFFICULTY_ORDER)[number];

export const DEFAULT_UNLOCKED_LEVELS: DifficultyLevel[] = ['beginner'];

export const COMPLETION_THRESHOLDS: Record<DifficultyLevel, number> = {
  beginner: 0,
  intermediate: 50,
  advanced: 150,
  expert: 300,
};

export const QUALITY_SCORE_REQUIREMENTS: Record<DifficultyLevel, number> = {
  beginner: 0,
  intermediate: 85,
  advanced: 90,
  expert: 95,
};

export const TRAINING_GATE_REQUIRED: Record<DifficultyLevel, boolean> = {
  beginner: false,
  intermediate: true,
  advanced: true,
  expert: true,
};

export const DOMAIN_ASSESSMENT_REQUIRED: Record<DifficultyLevel, boolean> = {
  beginner: false,
  intermediate: false,
  advanced: true,
  expert: true,
};

export interface UnlockMetrics {
  completedTasks: number;
  qualityScore: number | null;
  trainingGatesPassed: boolean;
  domainAssessmentsPassed: boolean;
}

export const DEFAULT_UNLOCK_METRICS: UnlockMetrics = {
  completedTasks: 0,
  qualityScore: null,
  trainingGatesPassed: false,
  domainAssessmentsPassed: false,
};

export interface UnlockEvaluation {
  difficulty: DifficultyLevel;
  eligible: boolean;
  missingReasons: string[];
}

export function evaluateDifficultyCriteria(difficulty: DifficultyLevel, metrics: UnlockMetrics): UnlockEvaluation {
  const reasons: string[] = [];
  if (metrics.completedTasks < COMPLETION_THRESHOLDS[difficulty]) {
    reasons.push(`Requires ${COMPLETION_THRESHOLDS[difficulty]} completed tasks`);
  }
  const minScore = QUALITY_SCORE_REQUIREMENTS[difficulty];
  if (minScore > 0 && (metrics.qualityScore ?? 0) < minScore) {
    reasons.push(`Quality score must be at least ${minScore}%`);
  }
  if (TRAINING_GATE_REQUIRED[difficulty] && !metrics.trainingGatesPassed) {
    reasons.push('Training gate completion required');
  }
  if (DOMAIN_ASSESSMENT_REQUIRED[difficulty] && !metrics.domainAssessmentsPassed) {
    reasons.push('Domain assessment must be passed');
  }
  return {
    difficulty,
    eligible: reasons.length === 0,
    missingReasons: reasons,
  };
}

export function getUnlockedDifficulties(metrics: UnlockMetrics): DifficultyLevel[] {
  const unlocked = new Set<DifficultyLevel>(DEFAULT_UNLOCKED_LEVELS);
  DIFFICULTY_ORDER.forEach((level) => {
    const evaluation = evaluateDifficultyCriteria(level, metrics);
    if (evaluation.eligible) {
      unlocked.add(level);
    }
  });
  return Array.from(unlocked.values());
}
