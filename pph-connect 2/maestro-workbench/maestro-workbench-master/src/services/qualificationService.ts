import { supabase } from '@/integrations/supabase/client';

const addMonths = (dateValue: string | null | undefined, months: number): string | null => {
  if (!dateValue) {
    return null;
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setMonth(parsed.getMonth() + months);
  return parsed.toISOString();
};

export interface WorkerQualification {
  id: string;
  name: string;
  score: number | null;
  passed: boolean;
  takenAt: string | null;
  expiresAt: string | null;
}

export interface QualificationDefinition {
  id: string;
  name: string;
  category: string;
  passingScore: number;
}

export async function listWorkerQualifications(workerId: string | undefined | null): Promise<WorkerQualification[]> {
  if (!workerId) {
    return [];
  }

  const { data, error } = await supabase
    .from('skill_assessments')
    .select('id, skill_name, score, passed, taken_at, expires_at')
    .eq('worker_id', workerId)
    .order('taken_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('qualificationService: failed to load worker qualifications', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.skill_name ?? 'Qualification',
    score: row.score != null ? Number(row.score) : null,
    passed: Boolean(row.passed),
    takenAt: row.taken_at ?? null,
    expiresAt: row.expires_at ?? addMonths(row.taken_at, 6),
  }));
}

export async function listAvailableQualifications(): Promise<QualificationDefinition[]> {
  const { data, error } = await supabase
    .from('skill_assessments')
    .select('id, skill_name, assessment_type, score')
    .is('worker_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('qualificationService: failed to load available qualifications', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.skill_name ?? 'Qualification',
    category: row.assessment_type ?? 'general',
    passingScore: row.score != null ? Number(row.score) : 0,
  }));
}

export async function listExpiringQualifications(
  workerId: string | undefined | null,
  renewalWindowDays = 30,
): Promise<WorkerQualification[]> {
  if (!workerId) {
    return [];
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + renewalWindowDays * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const windowIso = windowEnd.toISOString();

  const { data, error } = await supabase
    .from('skill_assessments')
    .select('id, skill_name, score, passed, taken_at, expires_at')
    .eq('worker_id', workerId)
    .not('expires_at', 'is', null)
    .gt('expires_at', nowIso)
    .lt('expires_at', windowIso)
    .order('expires_at', { ascending: true });

  if (error) {
    console.warn('qualificationService: failed to load expiring qualifications', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.skill_name ?? 'Qualification',
    score: row.score != null ? Number(row.score) : null,
    passed: Boolean(row.passed),
    takenAt: row.taken_at ?? null,
    expiresAt: row.expires_at ?? addMonths(row.taken_at, 6),
  }));
}
