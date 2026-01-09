import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types';
import { refreshGoldStandardMetrics } from '@/services/qualityService';

export interface SubmitAnswerParams {
  task: Task;
  workerId: string;
  formData: Record<string, unknown>;
  startTime: Date;
  completionTime: Date;
  skipped?: boolean;
  skipReason?: string | null;
}

export interface SubmitAnswerResult {
  questionId: string;
  questionIdentifier: string;
  answerId: string;
  isFullyAnswered: boolean;
  actualAnswerCount: number;
  ahtSeconds: number;
  trustRating: number | null;
  goldAccuracy: number | null;
  goldMatch: boolean | null;
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => typeof key === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `"${key}":${stableStringify(val)}`);

  return `{${entries.join(',')}}`;
};

const matchesGoldAnswer = (answer: Record<string, unknown>, expected: unknown) => {
  if (!expected) {
    return null;
  }
  const normalizedAnswer = stableStringify(answer ?? {});
  const normalizedExpected = stableStringify(expected);
  return normalizedAnswer === normalizedExpected;
};

export async function submitAnswer({
  task,
  workerId,
  formData,
  startTime,
  completionTime,
  skipped = false,
  skipReason = null,
}: SubmitAnswerParams): Promise<SubmitAnswerResult> {
  const startIso = startTime.toISOString();
  const completionIso = completionTime.toISOString();
  const ahtSeconds = Math.max(0, Math.floor((completionTime.getTime() - startTime.getTime()) / 1000));

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, question_id, required_replications, is_gold_standard, correct_answer')
    .eq('project_id', task.project_id)
    .eq('row_index', task.row_index)
    .single();

  if (questionError || !question) {
    throw new Error(questionError?.message ?? 'Question not found for this task');
  }

  const { data: answerId, error: answerIdError } = await supabase
    .rpc('generate_answer_id', { question_id: question.question_id });

  if (answerIdError || !answerId) {
    throw new Error(answerIdError?.message ?? 'Failed to generate answer id');
  }

  const generatedAnswerId = answerId as string;

  const { error: insertError } = await supabase
    .from('answers')
    .insert({
      question_id: question.id,
      project_id: task.project_id,
      answer_id: generatedAnswerId,
      worker_id: workerId,
      answer_data: formData,
      start_time: startIso,
      completion_time: completionIso,
      aht_seconds: ahtSeconds,
      skipped,
      skip_reason: skipReason,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { count: answerCount, error: countError } = await supabase
    .from('answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', question.id);

  if (countError) {
    throw new Error(countError.message);
  }

  const actualAnswerCount = answerCount ?? 0;
  const isFullyAnswered = actualAnswerCount >= (question.required_replications ?? 1);

  const { error: updateQuestionError } = await supabase
    .from('questions')
    .update({
      completed_replications: actualAnswerCount,
      is_answered: isFullyAnswered,
    })
    .eq('id', question.id);

  if (updateQuestionError) {
    throw new Error(updateQuestionError.message);
  }

  let trustRating: number | null = null;
  let goldAccuracy: number | null = null;
  let goldMatch: boolean | null = null;

  if (question.is_gold_standard) {
    try {
      goldMatch = matchesGoldAnswer(formData as Record<string, unknown>, question.correct_answer);
      const { trustRating: updatedTrust, accuracy } = await refreshGoldStandardMetrics(workerId, task.project_id);
      if (typeof updatedTrust === 'number') {
        trustRating = updatedTrust;
      }
      if (typeof accuracy === 'number') {
        goldAccuracy = accuracy;
      }
    } catch (qualityError) {
      console.warn('submitAnswer: failed to refresh gold metrics', qualityError);
    }
  }

  if (isFullyAnswered) {
    const { error: projectUpdateError } = await supabase
      .rpc('increment_project_completed_tasks', { project_id: task.project_id });

    if (projectUpdateError) {
      throw new Error(projectUpdateError.message);
    }
  }

  const mergedData = skipped
    ? { ...task.data, skipped: true, skip_reason: skipReason }
    : { ...task.data, ...formData };

  // Attempt to update task status (database trigger will also handle this as failsafe)
  const { data: updatedTask, error: taskUpdateError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: completionIso,
      completion_time_seconds: ahtSeconds,
      data: mergedData,
    })
    .eq('id', task.id)
    .select();

  if (taskUpdateError) {
    // Log warning but don't throw - database trigger will handle completion
    console.warn('Task update failed, relying on database trigger:', taskUpdateError);
  } else if (!updatedTask || updatedTask.length === 0) {
    // Update succeeded but affected 0 rows - possibly RLS blocked it
    console.warn('Task update affected 0 rows, relying on database trigger for task:', task.id);
  } else {
    // Success - task updated via client
    console.log('Task marked completed via client update:', task.id);
  }

  return {
    questionId: question.id,
    questionIdentifier: question.question_id,
    answerId: generatedAnswerId,
    isFullyAnswered,
    actualAnswerCount,
    ahtSeconds,
    trustRating,
    goldAccuracy,
    goldMatch,
  };
}
