import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';
import { applyBusinessRules, rankWorkers } from './mlAssignmentLogic';

export type WorkerProfile = {
  id: string;
  status: string;
  domains: string[];
  workload: number;
  isAvailable: boolean;
  recentAssignments?: number;
};

export type AssignmentContext = {
  taskId: string;
  domain: string;
  difficulty: string;
};

export async function getEligibleWorkers(context: AssignmentContext): Promise<WorkerProfile[]> {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select('id, status, workload, domains, is_available, recent_assignments')
    .contains('domains', [context.domain])
    .eq('status', 'active')
    .eq('is_available', true)
    .limit(200);

  if (error) {
    throw new Error(`Failed to fetch eligible workers: ${normalizeError(error)}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    workload: row.workload,
    domains: row.domains,
    isAvailable: row.is_available,
    recentAssignments: row.recent_assignments ?? 0,
  }));
}

async function scoreWorkers(taskId: string, workers: WorkerProfile[]) {
  return Promise.all(
    workers.map(async (worker) => {
      const response = await fetch('/match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: worker.id, taskId }),
      });
      const payload = await response.json();
      return { ...worker, score: payload.score ?? 0, fairnessWeight: payload.fairnessWeight ?? 1 };
    })
  );
}

export async function assignTaskWithModel(context: AssignmentContext) {
  const eligibleWorkers = await getEligibleWorkers(context);
  const filtered = applyBusinessRules(eligibleWorkers, { maxWorkload: 0.9, maxRecentAssignments: 5 });
  if (filtered.length === 0) {
    throw new Error('No eligible workers available for assignment');
  }

  const scored = await scoreWorkers(context.taskId, filtered);
  const ranked = rankWorkers(scored);
  const top = ranked[0];
  if (!top) {
    throw new Error('Failed to rank workers');
  }

  await supabase.from('task_assignments').insert({
    task_id: context.taskId,
    worker_id: top.id,
    score: top.score,
    metadata: { domain: context.domain, difficulty: context.difficulty },
  });

  await supabase.from('matching_decisions').insert({
    task_id: context.taskId,
    winner_worker_id: top.id,
    ranked_worker_ids: ranked.map((worker) => worker.id),
    model_scores: ranked.map((worker) => worker.score),
  });

  return top;
}
