import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

const ANOMALY_ENDPOINT =
  process.env.VITE_ANOMALY_ENDPOINT ??
  process.env.ANOMALY_ENDPOINT ??
  'https://anomaly.pph-connect.internal/score';

export async function scoreTaskSubmission(taskId: string, features: Record<string, unknown>) {
  const response = await fetch(ANOMALY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, features }),
  });

  if (!response.ok) {
    throw new Error(`Anomaly endpoint returned ${response.status}`);
  }

  const payload = (await response.json()) as { score: number };
  return payload.score;
}

export async function handleAnomalyResult(
  taskId: string,
  score: number,
  threshold = 0.7
) {
  const isAnomalous = score >= threshold;
  if (!isAnomalous) {
    return false;
  }

  const { error: insertError } = await supabase.from('quality_anomalies').insert({
    task_id: taskId,
    anomaly_score: score,
    flagged_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(`Failed to log anomaly: ${normalizeError(insertError)}`);
  }

  await supabase
    .from('tasks')
    .update({ status: 'needs_review' })
    .eq('id', taskId);

  await supabase.functions.invoke('send-message', {
    body: {
      recipient_roles: ['quality_admin'],
      subject: 'Task flagged for anomaly review',
      content: `Task ${taskId} exceeded the anomaly threshold (${score.toFixed(2)}).`,
    },
  });

  return true;
}
