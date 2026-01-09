import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

export async function approveRecommendation(workerId: string, nextTier: string, metadata: Record<string, unknown>) {
  const { error } = await supabase
    .from('workers')
    .update({ tier: nextTier })
    .eq('id', workerId);
  if (error) {
    throw new Error(`Failed to update worker tier: ${normalizeError(error)}`);
  }
  await supabase.from('tier_change_audit').insert({
    worker_id: workerId,
    next_tier: nextTier,
    metadata,
  });
}

export async function notifyWorker(workerId: string, message: string) {
  await supabase.functions.invoke('send-message', {
    body: {
      recipient_ids: [workerId],
      subject: 'Tier update',
      content: message,
    },
  });
}
