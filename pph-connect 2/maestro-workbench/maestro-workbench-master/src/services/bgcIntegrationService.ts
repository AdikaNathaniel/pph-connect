import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';
import { createBGCOrder, getBGCOrder } from './bgcProviderClient';

export async function triggerBGCForWorker(workerId: string) {
  const { data, error } = await supabase
    .from('workers')
    .select('id, full_name, email_personal, country')
    .eq('id', workerId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load worker ${workerId}: ${normalizeError(error)}`);
  }

  const order = await createBGCOrder({
    workerId,
    fullName: data.full_name ?? 'Unknown',
    email: data.email_personal ?? 'unknown@example.com',
    country: data.country ?? null,
  });

  await supabase.from('bgc_refresh_requests').insert({
    worker_id: workerId,
    status: 'pending',
    metadata: { orderId: order.id, estimatedCompletion: order.estimatedCompletion },
  });

  return order.id;
}

export async function reconcileBGCOrder(orderId: string) {
  const order = await getBGCOrder(orderId);

  if (order.status !== 'completed') {
    return order;
  }

  const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  await Promise.all([
    supabase
      .from('workers')
      .update({ bgc_expiration_date: expirationDate })
      .eq('id', order.id.split('_')[1]),
    supabase
      .from('bgc_refresh_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('metadata->>orderId', orderId),
  ]);

  return order;
}
