import { supabase } from '@/integrations/supabase/client';
import { evaluateRehireEligibility, type RehireEligibilityResult } from '@/lib/rehireEligibility';

export interface WorkerRehireRecord {
  id: string;
  rehire_eligible: boolean | null;
  termination_reason?: string | null;
  termination_date?: string | null;
}

export async function fetchWorkerRehireRecord(workerId: string | null): Promise<WorkerRehireRecord | null> {
  if (!workerId) {
    return null;
  }

  const { data, error } = await supabase
    .from('workers')
    .select('id, rehire_eligible, termination_reason, termination_date')
    .eq('id', workerId)
    .maybeSingle();

  if (error) {
    console.warn('rehireEligibilityService: failed to fetch worker record', error);
    return null;
  }

  return data as WorkerRehireRecord | null;
}

export async function checkRehireEligibility(workerId: string | null): Promise<RehireEligibilityResult & { workerId: string | null }> {
  if (!workerId) {
    return { workerId, eligible: true, reasonCode: 'eligible', eligibleAfter: null };
  }

  const record = await fetchWorkerRehireRecord(workerId);
  if (!record) {
    return { workerId, eligible: true, reasonCode: 'eligible', eligibleAfter: null };
  }

  const evaluation = evaluateRehireEligibility({
    terminationReason: record.termination_reason,
    terminationDate: record.termination_date,
  });

  if (record.rehire_eligible !== evaluation.eligible) {
    const { error } = await supabase
      .from('workers')
      .update({ rehire_eligible: evaluation.eligible })
      .eq('id', record.id);
    if (error) {
      console.warn('rehireEligibilityService: failed to persist rehire eligibility', error);
    }
  }

  return { workerId, ...evaluation };
}
