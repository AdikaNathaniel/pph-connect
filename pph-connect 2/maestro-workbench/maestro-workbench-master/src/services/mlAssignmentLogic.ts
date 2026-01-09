export type BusinessRuleContext = {
  maxWorkload?: number;
  maxRecentAssignments?: number;
};

export type WorkerCandidate = {
  id: string;
  workload: number;
  recentAssignments?: number;
};

export function applyBusinessRules(
  workers: WorkerCandidate[],
  context: BusinessRuleContext = {}
): WorkerCandidate[] {
  const { maxWorkload = 0.9, maxRecentAssignments = 5 } = context;
  return workers.filter(
    (worker) => worker.workload < maxWorkload && (worker.recentAssignments ?? 0) <= maxRecentAssignments
  );
}

export type RankedCandidate = WorkerCandidate & {
  score: number;
  fairnessWeight?: number;
};

export function rankWorkers(candidates: RankedCandidate[]): RankedCandidate[] {
  return [...candidates].sort((a, b) => {
    const aWeighted = a.score * (a.fairnessWeight ?? 1);
    const bWeighted = b.score * (b.fairnessWeight ?? 1);
    return bWeighted - aWeighted;
  });
}
