import { supabase } from '@/integrations/supabase/client';

export interface QualityWarningInput {
  workerId: string;
  projectId: string;
  projectName?: string | null;
  currentScore?: number | null;
  threshold?: number | null;
  recommendedActions?: string[];
  resolutionDue?: string | Date | null;
}

export interface QualityWarningResult {
  triggered: boolean;
  warningId?: string;
  reason?: string;
}

const DEFAULT_ACTIONS = [
  'Review the latest quality guidelines',
  'Complete a calibration session with your manager',
  'Acknowledge this warning in the portal'
];

const createResolutionDeadline = (input?: string | Date | null) => {
  if (!input) {
    return new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export async function triggerQualityWarning({
  workerId,
  projectId,
  projectName,
  currentScore,
  threshold,
  recommendedActions,
  resolutionDue,
}: QualityWarningInput): Promise<QualityWarningResult> {
  if (!workerId || !projectId) {
    return { triggered: false, reason: 'missing_identifiers' };
  }

  const actions = (recommendedActions && recommendedActions.length > 0)
    ? recommendedActions
    : DEFAULT_ACTIONS;

  const deadline = createResolutionDeadline(resolutionDue);

  const { data: existingWarnings, error: existingError } = await supabase
    .from('quality_warnings')
    .select('id')
    .eq('worker_id', workerId)
    .eq('project_id', projectId)
    .is('resolved_at', null)
    .limit(1);

  if (existingError) {
    console.warn('qualityWarningService: failed to inspect existing warnings', existingError);
  }

  if (existingWarnings && existingWarnings.length > 0) {
    return { triggered: false, reason: 'warning_already_open' };
  }

  const messageSubject = `Quality warning for ${projectName ?? 'assigned project'}`;

  const { data: inserted, error: insertError } = await supabase
    .from('quality_warnings')
    .insert({
      worker_id: workerId,
      project_id: projectId,
      current_score: currentScore ?? null,
      threshold: threshold ?? null,
      recommended_actions: actions,
      resolution_due: deadline,
      message_subject: messageSubject,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('qualityWarningService: failed to insert warning', insertError);
    throw insertError;
  }

  const formattedScore = typeof currentScore === 'number' ? currentScore.toFixed(1) : 'unknown';
  const formattedThreshold = typeof threshold === 'number' ? threshold.toFixed(1) : 'configured';

  const resolutionText = deadline
    ? new Date(deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'the next 5 days';

  const messageContent = [
    `Hi there,`,
    '',
    `Your recent quality score (${formattedScore}) for ${projectName ?? 'a managed project'} fell below the threshold (${formattedThreshold}).`,
    '',
    'To maintain access you need to:',
    ...actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    `Please complete the recommended actions by ${resolutionText}. Respond directly to this message if you need assistance.`,
    '',
    '— Workforce Quality Team',
  ].join('\n');

  try {
    await supabase.functions.invoke('send-message', {
      body: {
        recipient_ids: [workerId],
        subject: messageSubject,
        content: messageContent,
      },
    });
  } catch (messageError) {
    console.warn('qualityWarningService: failed to send warning message', messageError);
    // Warning record already exists; surface soft failure
    return { triggered: false, reason: 'message_send_failed' };
  }

  return {
    triggered: true,
    warningId: inserted?.id ?? undefined,
  };
}
