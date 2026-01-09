import { supabase } from '@/integrations/supabase/client';
import { calculateWorkerQualityScore } from '@/services/qualityService';

export interface QualityAlert {
  id: string;
  alertType: string;
  projectId: string | null;
  workerId: string | null;
  message?: string | null;
  metricValue?: number | null;
  threshold?: number | null;
  createdAt: string;
}

export interface CreateQualityAlertInput {
  alertType: string;
  projectId?: string | null;
  workerId?: string | null;
  message?: string;
  metricValue?: number | null;
  threshold?: number | null;
}

export async function fetchQualityAlerts(): Promise<QualityAlert[]> {
  const { data, error } = await supabase
    .from('quality_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('qualityAlertService: failed to fetch alerts', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    alertType: row.alert_type,
    projectId: row.project_id,
    workerId: row.worker_id,
    message: row.message,
    metricValue: row.metric_value,
    threshold: row.threshold,
    createdAt: row.created_at,
  }));
}

export async function createQualityAlert(input: CreateQualityAlertInput): Promise<void> {
  const { alertType, projectId = null, workerId = null, message, metricValue = null, threshold = null } = input;

  const { error } = await supabase
    .from('quality_alerts')
    .insert({
      alert_type: alertType,
      project_id: projectId,
      worker_id: workerId,
      message,
      metric_value: metricValue,
      threshold,
    });

  if (error) {
    console.error('qualityAlertService: failed to create alert', error);
    throw error;
  }
}

export async function evaluateQualityAndAlert(projectId: string, workerId: string) {
  const qualityScore = await calculateWorkerQualityScore(workerId, projectId);
  const metricValue = qualityScore?.compositeScore ?? null;

  if (metricValue != null && metricValue < 70) {
    const threshold = 80;
    await createQualityAlert({
      alertType: 'worker_quality_drop',
      projectId,
      workerId,
      message: `Worker score ${metricValue.toFixed(1)} dropped below ${threshold}.`,
      metricValue,
      threshold,
    });

    try {
      await supabase.functions.invoke('send-message', {
        body: {
          recipient_ids: [],
          subject: 'Quality alert triggered',
          content: `Worker ${workerId} fell below threshold on project ${projectId}.`,
        },
      });
    } catch (error) {
      console.warn('qualityAlertService: failed to send alert message', error);
    }
  }
}
