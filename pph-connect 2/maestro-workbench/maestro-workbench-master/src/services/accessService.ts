import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { calculateWorkerQualityScore } from '@/services/qualityService';

export interface ProjectAccessResult {
  projectId: string;
  projectName: string;
  listingId: string;
  allowed: boolean;
  reasons: string[];
  qualityScore: number | null;
  qualityThreshold: number | null;
  requiredSkills: string[];
  requiredQualifications: string[];
  requiresTrainingGate: boolean;
}

type ProjectListingRow = Database['public']['Tables']['project_listings']['Row'];
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type WorkerSkillRow = Database['public']['Tables']['worker_skills']['Row'];
type WorkerQualificationRow = Database['public']['Tables']['skill_assessments']['Row'];
type TrainingGateRow = Database['public']['Tables']['training_gates']['Row'];
type PerformanceThresholdRow = Database['public']['Tables']['performance_thresholds']['Row'];
type AutoRemovalRow = Database['public']['Tables']['auto_removals']['Row'];

const RECENT_VIOLATION_WINDOW_DAYS = 30;

const normalizeSkillList = (skills?: string[] | null) =>
  Array.isArray(skills)
    ? skills
        .map((skill) => skill?.toLowerCase().trim())
        .filter((value): value is string => Boolean(value))
    : [];

const normalizeQualificationList = (values?: unknown): string[] => {
  const source = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(values);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return source
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => Boolean(value));
};

const buildTrainingStats = (rows: TrainingGateRow[]) => {
  const stats = new Map<string, { total: number; passed: number }>();
  rows.forEach((row) => {
    if (!row.project_id) return;
    const current = stats.get(row.project_id) ?? { total: 0, passed: 0 };
    current.total += 1;
    if ((row.status ?? '').toLowerCase() === 'passed') {
      current.passed += 1;
    }
    stats.set(row.project_id, current);
  });
  return stats;
};

const hasCompletedTraining = (projectId: string, stats: Map<string, { total: number; passed: number }>) => {
  const value = stats.get(projectId);
  if (!value) {
    return false;
  }
  return value.total > 0 && value.passed === value.total;
};

export async function getAvailableProjects(workerId: string): Promise<ProjectAccessResult[]> {
  if (!workerId) {
    return [];
  }

  const violationCutoff = new Date(Date.now() - RECENT_VIOLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [
    listingsQuery,
    thresholdsQuery,
    skillsQuery,
    qualificationsQuery,
    trainingQuery,
    violationsQuery,
    qualityScore,
  ] = await Promise.all([
    supabase
      .from('project_listings')
      .select(
        `
          *,
          project:projects(
            id,
            project_name,
            requires_training_gate,
            required_qualifications
          )
        `
      )
      .eq('is_active', true),
    supabase
      .from('performance_thresholds')
      .select('project_id, metric_type, threshold_min')
      .eq('metric_type', 'quality'),
    supabase
      .from('worker_skills')
      .select('skill_name, verified')
      .eq('worker_id', workerId),
    supabase
      .from('skill_assessments')
      .select('skill_name, passed, expires_at')
      .eq('worker_id', workerId)
      .eq('passed', true),
    supabase
      .from('training_gates')
      .select('project_id, status')
      .eq('worker_id', workerId),
    supabase
      .from('auto_removals')
      .select('project_id, removal_reason, removed_at')
      .eq('worker_id', workerId)
      .gte('removed_at', violationCutoff),
    calculateWorkerQualityScore(workerId, null),
  ]);

  if (listingsQuery.error) {
    console.warn('accessService: failed to load project listings', listingsQuery.error);
    return [];
  }

  const listings =
    (listingsQuery.data ?? []) as Array<
      ProjectListingRow & {
        project: ProjectRow | null;
      }
    >;

  const qualityThresholds = new Map<string, number>();
  (thresholdsQuery.data ?? []).forEach((row: PerformanceThresholdRow) => {
    if (row.project_id && row.threshold_min != null) {
      qualityThresholds.set(row.project_id, Number(row.threshold_min));
    }
  });

  const verifiedSkills = new Set(
    (skillsQuery.data ?? [])
      .filter((row: WorkerSkillRow) => row.verified)
      .map((row) => row.skill_name?.toLowerCase().trim())
      .filter((value): value is string => Boolean(value))
  );

  const completedQualifications = new Map<string, { valid: boolean }>();
  if (qualificationsQuery.error) {
    console.warn('accessService: failed to load worker qualifications', qualificationsQuery.error);
  } else {
    (qualificationsQuery.data ?? [])
      .filter((row: WorkerQualificationRow) => row.passed && typeof row.skill_name === 'string')
      .forEach((row) => {
        const normalized = row.skill_name?.toLowerCase().trim();
        if (!normalized) return;
        const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
        const isValid = !expiresAt || expiresAt.getTime() > Date.now();
        completedQualifications.set(normalized, { valid: isValid });
      });
  }

  const trainingStats = buildTrainingStats((trainingQuery.data ?? []) as TrainingGateRow[]);

  const violations = new Map<string, AutoRemovalRow>();
  (violationsQuery.data ?? []).forEach((row: AutoRemovalRow) => {
    if (!row.project_id) return;
    violations.set(row.project_id, row);
  });

  const workerQualityScore = qualityScore?.compositeScore ?? null;

  const accessResults = listings.map((listing) => {
    const projectId = listing.project_id;
    const projectName = listing.project?.project_name ?? 'Unnamed Project';
    const requiredSkills = normalizeSkillList(listing.required_skills);
    const requiredQualifications = normalizeQualificationList(listing.project?.required_qualifications);
    const reasons: string[] = [];

    const threshold = qualityThresholds.get(projectId) ?? null;
    if (threshold != null && (workerQualityScore ?? -Infinity) < threshold) {
      reasons.push('quality_threshold');
    }

    const missingSkill = requiredSkills.find((skill) => !verifiedSkills.has(skill));
    if (missingSkill) {
      reasons.push('missing_skills');
    }

    const missingQualification = requiredQualifications.find((qualification) => {
      const normalizedQualification = qualification.toLowerCase();
      return !completedQualifications.has(normalizedQualification);
    });
    const expiredQualification =
      missingQualification == null
        ? requiredQualifications.find((qualification) => {
            const status = completedQualifications.get(qualification.toLowerCase());
            return status ? !status.valid : false;
          })
        : null;
    if (missingQualification) {
      reasons.push('missing_qualifications');
    } else if (expiredQualification) {
      reasons.push('qualification_expired');
    }

    const requiresTraining = Boolean(listing.project?.requires_training_gate);
    if (requiresTraining && !hasCompletedTraining(projectId, trainingStats)) {
      reasons.push('training_incomplete');
    }

    const violation = violations.get(projectId);
    const violationReason = violation?.removal_reason?.toLowerCase() ?? '';
    if (violationReason.includes('quality')) {
      reasons.push('recent_violation');
    }

    const allowed = reasons.length === 0;

    return {
      projectId,
      projectName,
      listingId: listing.id,
      allowed,
      reasons,
      qualityScore: workerQualityScore,
      qualityThreshold: threshold,
      requiredSkills: listing.required_skills ?? [],
      requiredQualifications,
      requiresTrainingGate: requiresTraining,
    };
  });

  return accessResults;
}
