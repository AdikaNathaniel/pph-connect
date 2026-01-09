import { supabase } from '@/integrations/supabase/client';

interface WorkerStatsSnapshot {
  completedTasks: number;
  qualityScore: number | null;
  fastestCompletionSeconds: number | null;
  assessmentsPassed: number;
}

interface AchievementDefinition {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  criteria: {
    slug: string;
    threshold?: number;
  };
}

const ACHIEVEMENT_SLUGS = {
  FIRST_10_TASKS: 'first_10_tasks',
  HUNDRED_TASKS: 'hundred_tasks',
  QUALITY_MASTER: 'quality_master',
  SPEED_DEMON: 'speed_demon',
  DOMAIN_EXPERT: 'domain_expert',
} as const;

const DEFAULT_THRESHOLDS = {
  [ACHIEVEMENT_SLUGS.FIRST_10_TASKS]: 10,
  [ACHIEVEMENT_SLUGS.HUNDRED_TASKS]: 100,
  [ACHIEVEMENT_SLUGS.QUALITY_MASTER]: 95,
  [ACHIEVEMENT_SLUGS.SPEED_DEMON]: 60,
  [ACHIEVEMENT_SLUGS.DOMAIN_EXPERT]: 1,
} satisfies Record<string, number>;

interface EarnedAchievementRow {
  achievement_id: string;
  earned_at: string | null;
}

export interface WorkerAchievementProgress {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  earned: boolean;
  earnedAt?: string | null;
  progressPercent: number;
  progressLabel: string;
}

const normalizeNumber = (value: number | null | undefined) => (Number.isFinite(value) ? Number(value) : 0);
const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const resolveThreshold = (definition: AchievementDefinition, fallbackSlug: keyof typeof DEFAULT_THRESHOLDS) => {
  const custom = Number(definition.criteria.threshold);
  if (Number.isFinite(custom) && custom > 0) {
    return custom;
  }
  return DEFAULT_THRESHOLDS[fallbackSlug];
};

const fetchWorkerStats = async (workerId: string): Promise<WorkerStatsSnapshot> => {
  const [workStats, qualityMetric, assessments] = await Promise.all([
    supabase
      .from('work_stats')
      .select('units_completed, completed_at')
      .eq('worker_id', workerId),
    supabase
      .from('quality_metrics')
      .select('metric_value')
      .eq('worker_id', workerId)
      .eq('metric_type', 'quality')
      .order('measured_at', { ascending: false })
      .limit(1),
    supabase
      .from('skill_assessments')
      .select('passed')
      .eq('worker_id', workerId)
      .eq('passed', true),
  ]);

  const totalTasks = (workStats.data ?? []).reduce((sum, row) => sum + normalizeNumber(row.units_completed), 0);
  const fastestCompletionSeconds = Math.min(
    ...((workStats.data ?? [])
      .map((row) => {
        if (!row.completed_at) return Number.POSITIVE_INFINITY;
        return normalizeNumber(row.completed_at as unknown as number);
      })
      .filter((value) => Number.isFinite(value))),
  );

  return {
    completedTasks: totalTasks,
    qualityScore: normalizeNumber(qualityMetric.data?.[0]?.metric_value ?? null) || null,
    fastestCompletionSeconds: Number.isFinite(fastestCompletionSeconds) ? fastestCompletionSeconds : null,
    assessmentsPassed: (assessments.data ?? []).length,
  };
};

const fetchEarnedAchievements = async (workerId: string): Promise<EarnedAchievementRow[]> => {
  const { data, error } = await supabase
    .from('worker_achievements')
    .select('achievement_id, earned_at')
    .eq('worker_id', workerId);
  if (error) {
    console.warn('achievementTrackingService: failed to load worker achievements', error);
    return [];
  }
  return data ?? [];
};

const fetchTrackedAchievements = async (): Promise<AchievementDefinition[]> => {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, name, description, icon, criteria');
  if (error) {
    console.warn('achievementTrackingService: failed to load definitions', error);
    return [];
  }
  return data
    ?.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      criteria: (row.criteria ?? {}) as { slug: string; threshold?: number },
    }))
    .filter((row) => row.criteria?.slug) ?? [];
};

const meetsCriteria = (definition: AchievementDefinition, stats: WorkerStatsSnapshot): boolean => {
  switch (definition.criteria.slug) {
    case ACHIEVEMENT_SLUGS.FIRST_10_TASKS:
      return stats.completedTasks >= resolveThreshold(definition, ACHIEVEMENT_SLUGS.FIRST_10_TASKS);
    case ACHIEVEMENT_SLUGS.HUNDRED_TASKS:
      return stats.completedTasks >= resolveThreshold(definition, ACHIEVEMENT_SLUGS.HUNDRED_TASKS);
    case ACHIEVEMENT_SLUGS.QUALITY_MASTER:
      return (stats.qualityScore ?? 0) >= resolveThreshold(definition, ACHIEVEMENT_SLUGS.QUALITY_MASTER);
    case ACHIEVEMENT_SLUGS.SPEED_DEMON:
      return (
        stats.fastestCompletionSeconds != null &&
        stats.fastestCompletionSeconds <= resolveThreshold(definition, ACHIEVEMENT_SLUGS.SPEED_DEMON)
      );
    case ACHIEVEMENT_SLUGS.DOMAIN_EXPERT:
      return stats.assessmentsPassed >= resolveThreshold(definition, ACHIEVEMENT_SLUGS.DOMAIN_EXPERT);
    default:
      return false;
  }
};

const buildProgressMeta = (definition: AchievementDefinition, stats: WorkerStatsSnapshot) => {
  const slug = definition.criteria.slug;
  switch (slug) {
    case ACHIEVEMENT_SLUGS.FIRST_10_TASKS:
    case ACHIEVEMENT_SLUGS.HUNDRED_TASKS: {
      const target = resolveThreshold(definition, slug as keyof typeof DEFAULT_THRESHOLDS);
      const current = stats.completedTasks;
      return {
        percent: clampPercent((current / target) * 100),
        label: `${Math.min(current, target)} / ${target} tasks completed`,
      };
    }
    case ACHIEVEMENT_SLUGS.QUALITY_MASTER: {
      const target = resolveThreshold(definition, ACHIEVEMENT_SLUGS.QUALITY_MASTER);
      const current = stats.qualityScore ?? 0;
      return {
        percent: clampPercent((current / target) * 100),
        label: `${Math.round(current)}% quality / ${target}% goal`,
      };
    }
    case ACHIEVEMENT_SLUGS.SPEED_DEMON: {
      const target = resolveThreshold(definition, ACHIEVEMENT_SLUGS.SPEED_DEMON);
      const fastest = stats.fastestCompletionSeconds;
      if (!fastest || fastest <= 0) {
        return {
          percent: 0,
          label: `Aim for ≤ ${target}s handling time`,
        };
      }
      return {
        percent: clampPercent((target / fastest) * 100),
        label: `${Math.round(fastest)}s best / ${target}s goal`,
      };
    }
    case ACHIEVEMENT_SLUGS.DOMAIN_EXPERT: {
      const target = resolveThreshold(definition, ACHIEVEMENT_SLUGS.DOMAIN_EXPERT);
      const current = stats.assessmentsPassed;
      return {
        percent: clampPercent((current / Math.max(target, 1)) * 100),
        label: `${current} / ${target} assessments passed`,
      };
    }
    default:
      return {
        percent: 0,
        label: 'Progress unavailable',
      };
  }
};

export async function checkWorkerAchievements(workerId: string): Promise<string[]> {
  if (!workerId) return [];
  const [definitions, stats, earnedRows] = await Promise.all([
    fetchTrackedAchievements(),
    fetchWorkerStats(workerId),
    fetchEarnedAchievements(workerId),
  ]);
  const earnedIds = new Set(earnedRows.map((row) => row.achievement_id));

  const newlyEarned = definitions.filter(
    (definition) => !earnedIds.has(definition.id) && meetsCriteria(definition, stats)
  );

  if (!newlyEarned.length) {
    return [];
  }

  const { error } = await supabase.from('worker_achievements').insert(
    newlyEarned.map((definition) => ({
      worker_id: workerId,
      achievement_id: definition.id,
      notes: `Earned for meeting ${definition.name} criteria`,
    }))
  );

  if (error) {
    console.warn('achievementTrackingService: failed to record achievements', error);
    return [];
  }

  return newlyEarned.map((definition) => definition.name ?? definition.id);
}

export async function getWorkerAchievementProgress(workerId: string): Promise<WorkerAchievementProgress[]> {
  if (!workerId) return [];
  const [definitions, stats, earnedRows] = await Promise.all([
    fetchTrackedAchievements(),
    fetchWorkerStats(workerId),
    fetchEarnedAchievements(workerId),
  ]);
  const earnedMap = new Map(earnedRows.map((row) => [row.achievement_id, row.earned_at]));

  return definitions
    .map((definition) => {
      const earnedAt = earnedMap.get(definition.id) ?? null;
      const earned = Boolean(earnedAt);
      const progressMeta = earned ? { percent: 100, label: 'Completed' } : buildProgressMeta(definition, stats);
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        earned,
        earnedAt,
        progressPercent: progressMeta.percent,
        progressLabel: progressMeta.label,
      } satisfies WorkerAchievementProgress;
    })
    .sort((a, b) => {
      if (a.earned !== b.earned) {
        return a.earned ? -1 : 1;
      }
      return b.progressPercent - a.progressPercent;
    });
}
