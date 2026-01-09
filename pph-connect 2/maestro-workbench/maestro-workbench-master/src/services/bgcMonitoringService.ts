import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';
import { BGCWorkerRecord, evaluateBGCStatuses } from './bgcMonitoringLogic';

const formatReminderList = (workers: BGCWorkerRecord[]) =>
  workers.map((worker) => `• ${worker.full_name ?? 'Unknown'} (${worker.bgc_expiration_date ?? 'n/a'})`).join('\n');

async function sendReminder(subject: string, content: string) {
  await supabase.functions.invoke('send-message', {
    body: {
      recipient_roles: ['admin'],
      subject,
      content,
    },
  });
}

export async function runBGCMonitoringJob(today: Date = new Date()) {
  const { data: workerData, error } = await supabase
    .from('workers')
    .select('id, full_name, email_personal, status, bgc_expiration_date')
    .not('bgc_expiration_date', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch workers for BGC monitoring: ${normalizeError(error)}`);
  }

  const evaluation = evaluateBGCStatuses(workerData ?? [], today);

  if (evaluation.remind60.length > 0) {
    await sendReminder(
      'BGC expiring in 60 days',
      `The following workers need a 60-day reminder:\n${formatReminderList(evaluation.remind60)}`
    );
  }

  if (evaluation.remind30.length > 0) {
    await sendReminder(
      'BGC expiring in 30 days',
      `The following workers need a 30-day reminder:\n${formatReminderList(evaluation.remind30)}`
    );
  }

  if (evaluation.remind7.length > 0) {
    await sendReminder(
      'BGC expiring within a week',
      `The following workers need an urgent 7-day reminder:\n${formatReminderList(evaluation.remind7)}`
    );
  }

  if (evaluation.overdue.length > 0) {
    await sendReminder(
      'BGC expired',
      `The following workers have expired BGC checks and will be suspended:\n${formatReminderList(evaluation.overdue)}`
    );

    const suspendIds = evaluation.overdue.map((worker) => worker.id);
    await supabase.from('workers').update({ status: 'suspended' }).in('id', suspendIds);
    await supabase.from('bgc_refresh_requests').insert(
      evaluation.overdue.map((worker) => ({
        worker_id: worker.id,
        metadata: { full_name: worker.full_name, email: worker.email_personal },
      }))
    );
  }

  return evaluation;
}
