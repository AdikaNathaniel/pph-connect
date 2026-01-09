import { supabase } from '@/integrations/supabase/client';
import {
  calculateGoalProgress,
  getPeriodWindow,
  GoalComputationContext,
  WorkerGoalPeriod,
  WorkerGoalRecord,
  WorkerGoalType,
  WorkerGoalWithProgress as WorkerGoalWithProgressType,
} from './workerGoalsLogic';

export type WorkerGoalWithProgress = WorkerGoalWithProgressType;

export interface UpsertWorkerGoalInput {
  id?: string;
  goal_type: WorkerGoalType;
  period: WorkerGoalPeriod;
  target_value: number;
  description?: string;
  start_date?: string;
  end_date?: string;
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const computeWindowFromInput = (period: WorkerGoalPeriod, start?: string, end?: string) => {
  if (start && end) {
    return { start, end };
  }

  if (start) {
    const startDate = new Date(start);
    const derivedEnd =
      period === 'monthly'
        ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0))
        : new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + 6));
    return { start: formatDate(startDate), end: formatDate(derivedEnd) };
  }

  const { start: defaultStart, end: defaultEnd } = getPeriodWindow(period);
  return { start: formatDate(defaultStart), end: formatDate(defaultEnd) };
};

const determineDataWindow = (goals: WorkerGoalRecord[]) => {
  if (!goals.length) {
    return null;
  }

  const [minStart, maxEnd] = goals.reduce<[Date, Date]>(
    ([currentStart, currentEnd], goal) => {
      const goalStart = new Date(goal.start_date);
      const goalEnd = new Date(goal.end_date);
      return [
        goalStart < currentStart ? goalStart : currentStart,
        goalEnd > currentEnd ? goalEnd : currentEnd,
      ];
    },
    [new Date(goals[0].start_date), new Date(goals[0].end_date)]
  );

  return {
    start: formatDate(minStart),
    end: formatDate(maxEnd),
  };
};

export async function fetchWorkerGoalsWithProgress(workerId: string | null): Promise<WorkerGoalWithProgress[]> {
  if (!workerId) {
    return [];
  }

  const { data: goalsResponse, error } = await supabase
    .from('worker_goals')
    .select('*')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('workerGoalsService: failed to load goals', error);
    return [];
  }

  const goals = (goalsResponse ?? []) as WorkerGoalRecord[];

  if (goals.length === 0) {
    return [];
  }

  const window = determineDataWindow(goals);
  const lastGoal = goals[goals.length - 1];
  const fallbackStart = window?.start ?? lastGoal.start_date;
  const fallbackEnd = window?.end ?? goals[0].end_date;

  const [workStatsResult, qualityMetricsResult] = await Promise.all([
    supabase
      .from('work_stats')
      .select('work_date, units_completed, earnings')
      .eq('worker_id', workerId)
      .gte('work_date', fallbackStart)
      .lte('work_date', fallbackEnd),
    supabase
      .from('quality_metrics')
      .select('measured_at, metric_value')
      .eq('worker_id', workerId)
      .eq('metric_type', 'quality')
      .gte('measured_at', `${fallbackStart}T00:00:00`)
      .lte('measured_at', `${fallbackEnd}T23:59:59`),
  ]);

  if (workStatsResult.error) {
    console.warn('workerGoalsService: failed to load work stats for goals', workStatsResult.error);
  }
  if (qualityMetricsResult.error) {
    console.warn('workerGoalsService: failed to load quality metrics for goals', qualityMetricsResult.error);
  }

  const context: GoalComputationContext = {
    workStats: workStatsResult.data ?? [],
    qualityMetrics: qualityMetricsResult.data ?? [],
  };

  return goals.map((goal) => calculateGoalProgress(goal, context));
}

export async function upsertWorkerGoal(workerId: string | null, payload: UpsertWorkerGoalInput) {
  if (!workerId) {
    throw new Error('workerGoalsService: workerId is required to upsert goals');
  }

  const { start, end } = computeWindowFromInput(payload.period, payload.start_date, payload.end_date);
  const body = {
    goal_type: payload.goal_type,
    period: payload.period,
    target_value: payload.target_value,
    description: payload.description ?? null,
    start_date: start,
    end_date: end,
    worker_id: workerId,
  };

  if (payload.id) {
    const { error } = await supabase
      .from('worker_goals')
      .update(body)
      .eq('id', payload.id)
      .eq('worker_id', workerId);

    if (error) {
      throw error;
    }
    return { id: payload.id, ...body };
  }

  const { data, error } = await supabase
    .from('worker_goals')
    .insert(body)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as WorkerGoalRecord;
}
