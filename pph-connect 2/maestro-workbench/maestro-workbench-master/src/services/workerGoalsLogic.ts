export type WorkerGoalType = 'tasks' | 'quality' | 'earnings';
export type WorkerGoalPeriod = 'weekly' | 'monthly';
export type WorkerGoalStatus = 'active' | 'completed' | 'expired';

export interface WorkerGoalRecord {
  id: string;
  worker_id: string;
  goal_type: WorkerGoalType;
  period: WorkerGoalPeriod;
  target_value: number;
  description: string | null;
  start_date: string;
  end_date: string;
  status: WorkerGoalStatus;
  progress_value?: number | null;
  progress_percent?: number | null;
  celebrated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalComputationContext {
  workStats: Array<{ work_date?: string | null; units_completed?: number | null; earnings?: number | null }>;
  qualityMetrics: Array<{ measured_at?: string | null; metric_value?: number | null }>;
}

export interface WorkerGoalWithProgress extends WorkerGoalRecord {
  progressValue: number;
  progressPercent: number;
  isCompleted: boolean;
  statusLabel: string;
  shouldCelebrate: boolean;
  status: WorkerGoalStatus;
}

const toDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

const isWithinRange = (candidate: string | null | undefined, start: Date, end: Date) => {
  if (!candidate) return false;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date >= start && date <= end;
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
};

const sumStat = (
  records: GoalComputationContext['workStats'],
  start: Date,
  end: Date,
  field: 'units_completed' | 'earnings'
) =>
  records
    .filter((row) => isWithinRange(row.work_date ?? null, start, end))
    .reduce((sum, row) => sum + Number(row[field] ?? 0), 0);

const averageQuality = (records: GoalComputationContext['qualityMetrics'], start: Date, end: Date) => {
  const scoped = records
    .filter((metric) => isWithinRange(metric.measured_at ?? null, start, end))
    .map((metric) => Number(metric.metric_value ?? 0))
    .filter((value) => Number.isFinite(value));

  if (!scoped.length) {
    return 0;
  }

  const total = scoped.reduce((sum, value) => sum + value, 0);
  return total / scoped.length;
};

export function calculateGoalProgress(
  goal: WorkerGoalRecord,
  context: GoalComputationContext
): WorkerGoalWithProgress {
  const start = toDate(goal.start_date);
  const end = toDate(goal.end_date);
  const target = Number(goal.target_value ?? 0);
  let progressValue = 0;

  switch (goal.goal_type) {
    case 'earnings':
      progressValue = sumStat(context.workStats, start, end, 'earnings');
      break;
    case 'quality':
      progressValue = averageQuality(context.qualityMetrics, start, end);
      break;
    case 'tasks':
    default:
      progressValue = sumStat(context.workStats, start, end, 'units_completed');
      break;
  }

  const denominator = target > 0 ? target : 1;
  const rawPercent = goal.goal_type === 'quality'
    ? (progressValue / denominator) * 100
    : (progressValue / denominator) * 100;
  const progressPercent = clampPercent(rawPercent);

  const now = new Date();
  const isCompleted = target > 0 ? progressValue >= target : false;
  let derivedStatus: WorkerGoalStatus = goal.status;

  if (isCompleted) {
    derivedStatus = 'completed';
  } else if (derivedStatus !== 'completed' && now > end) {
    derivedStatus = 'expired';
  }

  const statusLabel =
    derivedStatus === 'completed'
      ? 'Goal completed'
      : derivedStatus === 'expired'
        ? 'Goal expired'
        : 'In progress';

  const shouldCelebrate = derivedStatus === 'completed' && !goal.celebrated_at;

  return {
    ...goal,
    progressValue,
    progressPercent,
    isCompleted,
    status: derivedStatus,
    statusLabel,
    shouldCelebrate,
  };
}

export const getPeriodWindow = (period: WorkerGoalPeriod) => {
  const now = new Date();
  if (period === 'monthly') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    return { start, end };
  }

  // Weekly window starts on Monday.
  const day = now.getUTCDay();
  const mondayOffset = (day === 0 ? -6 : 1) - day;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59));
  return { start, end };
};
