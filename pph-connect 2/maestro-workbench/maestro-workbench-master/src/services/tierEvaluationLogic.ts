export type WorkerMetrics = {
  id: string;
  tier: 'tier0' | 'tier1' | 'tier2';
  tasksCompleted: number;
  qualityScore90d: number;
  qualityViolations90d: number;
  passedTier1Assessment?: boolean;
  passedTier2Assessment?: boolean;
  passedDomainInterview?: boolean;
};

export type PromotionResult = {
  eligible: boolean;
  nextTier?: string;
  reasons: string[];
};

export function checkPromotionEligibility(worker: WorkerMetrics): PromotionResult {
  const reasons: string[] = [];
  if (worker.tier === 'tier0') {
    if (worker.tasksCompleted < 500) reasons.push('Need 500+ tasks');
    if (worker.qualityScore90d < 0.95) reasons.push('Quality < 95%');
    if (!worker.passedTier1Assessment) reasons.push('Tier1 assessment incomplete');
    if (worker.qualityViolations90d > 0) reasons.push('Recent quality violations');
    return { eligible: reasons.length === 0, nextTier: 'tier1', reasons };
  }
  if (worker.tier === 'tier1') {
    if (worker.tasksCompleted < 1000) reasons.push('Need 1000+ tasks');
    if (worker.qualityScore90d < 0.98) reasons.push('Quality < 98%');
    if (!worker.passedTier2Assessment) reasons.push('Tier2 assessment incomplete');
    if (!worker.passedDomainInterview) reasons.push('Domain interview pending');
    return { eligible: reasons.length === 0, nextTier: 'tier2', reasons };
  }
  return { eligible: false, reasons };
}

export type DemotionResult = {
  shouldDemote: boolean;
  reasons: string[];
};

export function checkDemotion(worker: WorkerMetrics): DemotionResult {
  const reasons: string[] = [];
  const thresholds = worker.tier === 'tier2' ? 0.97 : 0.95;
  if (worker.qualityScore90d < thresholds) reasons.push('Quality below threshold');
  if (worker.qualityViolations90d >= 3) reasons.push('Multiple quality violations');
  return { shouldDemote: reasons.length > 0, reasons };
}
