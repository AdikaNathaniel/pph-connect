import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';
import { checkPromotionEligibility, checkDemotion, type WorkerMetrics } from './tierEvaluationLogic';

export async function buildTierRecommendations() {
  const { data, error } = await supabase.from('worker_metrics_view').select('*');
  if (error) {
    throw new Error(`Failed to load worker metrics: ${normalizeError(error)}`);
  }
  const workers = (data ?? []) as WorkerMetrics[];
  return workers.map((worker) => ({
    workerId: worker.id,
    promotion: checkPromotionEligibility(worker),
    demotion: checkDemotion(worker),
  }));
}
