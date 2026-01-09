import { supabase } from '@/integrations/supabase/client';

export interface ManagerAnalyticsSummary {
  summaryCards: {
    activeProjects: number;
    activeWorkers: number;
    tasksToday: number;
    tasksThisWeek: number;
    averageQualityScore: number | null;
  };
  chartData: {
    projectProgress: Array<{ projectName: string; tasks: number }>;
    workerDistribution: Array<{ workerName: string; tasks: number }>;
    qualityTrend: Array<{ date: string; score: number }>;
    taskVelocity: Array<{ date: string; tasks: number }>;
  };
  alerts: {
    projectsBehindSchedule: string[];
    qualityDecline: string[];
    rejectionRisks: string[];
  };
}

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const aggregateByKey = <Key extends string>(
  rows: Array<{ key: Key; value: number }>,
  limit = 5
) => {
  const map = new Map<Key, number>();
  rows.forEach(({ key, value }) => {
    map.set(key, (map.get(key) ?? 0) + value);
  });
  return Array.from(map.entries())
    .map(([key, value]) => ({ projectName: key, tasks: value }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, limit);
};

const aggregateWorkerDistribution = (
  rows: Array<{ workerName: string; tasks: number }>,
  limit = 5
) => {
  const map = new Map<string, number>();
  rows.forEach(({ workerName, tasks }) => {
    map.set(workerName, (map.get(workerName) ?? 0) + tasks);
  });
  return Array.from(map.entries())
    .map(([workerName, tasks]) => ({ workerName, tasks }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, limit);
};

const aggregateByDate = (
  rows: Array<{ date: string; value: number }>
) => {
  const map = new Map<string, number>();
  rows.forEach(({ date, value }) => {
    map.set(date, (map.get(date) ?? 0) + value);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({ date, value }));
};

export async function fetchManagerAnalyticsSummary(): Promise<ManagerAnalyticsSummary> {
  const today = new Date();
  const todayIso = formatDate(today);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  const weekAgoIso = formatDate(weekAgo);
  const twoWeeksAgoIso = formatDate(twoWeeksAgo);

  const [projectsResult, workersResult, workStatsResult, qualityMetricsResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('work_stats')
      .select('work_date, units_completed, project_id, worker_id, projects(project_name), workers(full_name)')
      .gte('work_date', twoWeeksAgoIso)
      .order('work_date', { ascending: true })
      .limit(5000),
    supabase
      .from('quality_metrics')
      .select('measured_at, metric_value')
      .eq('metric_type', 'quality')
      .gte('measured_at', `${twoWeeksAgoIso}T00:00:00`)
      .order('measured_at', { ascending: true })
      .limit(5000),
  ]);

  const workStats = workStatsResult.data ?? [];
  const qualityMetrics = qualityMetricsResult.data ?? [];

  const tasksToday = workStats.reduce((sum, row) => {
    return row.work_date === todayIso ? sum + Number(row.units_completed ?? 0) : sum;
  }, 0);

  const tasksThisWeek = workStats.reduce((sum, row) => {
    return row.work_date >= weekAgoIso ? sum + Number(row.units_completed ?? 0) : sum;
  }, 0);

  const projectProgress = aggregateByKey(
    workStats.map((row) => ({
      key: (row.projects as { project_name?: string } | null)?.project_name ?? 'Unassigned',
      value: Number(row.units_completed ?? 0),
    }))
  );

  const workerDistribution = aggregateWorkerDistribution(
    workStats.map((row) => ({
      workerName: (row.workers as { full_name?: string } | null)?.full_name ?? 'Unknown',
      tasks: Number(row.units_completed ?? 0),
    }))
  );

  const taskVelocitySeries = aggregateByDate(
    workStats.map((row) => ({
      date: row.work_date ?? todayIso,
      value: Number(row.units_completed ?? 0),
    }))
  ).map(({ date, value }) => ({ date, tasks: value }));

  const qualityTrend = aggregateByDate(
    qualityMetrics.map((row) => ({
      date: (row.measured_at ?? '').slice(0, 10),
      value: Number(row.metric_value ?? 0),
    }))
  ).map(({ date, value }) => ({ date, score: Number(value.toFixed(2)) }));

  const averageQualityScore = qualityMetrics.length
    ? Number(
        (
          qualityMetrics.reduce((sum, row) => sum + Number(row.metric_value ?? 0), 0) /
          qualityMetrics.length
        ).toFixed(2)
      )
    : null;

  const alerts = {
    projectsBehindSchedule: [] as string[],
    qualityDecline: [] as string[],
    rejectionRisks: [] as string[],
  };

  const averageProjectTasks = projectProgress.length
    ? projectProgress.reduce((sum, project) => sum + project.tasks, 0) / projectProgress.length
    : 0;

  if (averageProjectTasks > 0) {
    projectProgress
      .filter((project) => project.tasks < averageProjectTasks * 0.5)
      .slice(0, 3)
      .forEach((project) => {
        alerts.projectsBehindSchedule.push(
          `${project.projectName} is producing ${Math.round((project.tasks / averageProjectTasks) * 100)}% of the forecast.`
        );
      });
  }

  if (qualityTrend.length > 1) {
    const firstScore = qualityTrend[0].score;
    const latestScore = qualityTrend[qualityTrend.length - 1].score;
    if (latestScore + 5 < firstScore) {
      alerts.qualityDecline.push(`Workspace quality dropped ${(firstScore - latestScore).toFixed(1)} pts in the last two weeks.`);
    }
  }

  if ((averageQualityScore ?? 100) < 85) {
    alerts.rejectionRisks.push('Average quality is below 85% — review calibration tasks.');
  }

  if (!alerts.projectsBehindSchedule.length) {
    alerts.projectsBehindSchedule.push('All monitored projects are on track.');
  }
  if (!alerts.qualityDecline.length) {
    alerts.qualityDecline.push('Quality scores look stable.');
  }
  if (!alerts.rejectionRisks.length) {
    alerts.rejectionRisks.push('No rejection risk alerts.');
  }

  return {
    summaryCards: {
      activeProjects: projectsResult.count ?? 0,
      activeWorkers: workersResult.count ?? 0,
      tasksToday,
      tasksThisWeek,
      averageQualityScore,
    },
    chartData: {
      projectProgress,
      workerDistribution,
      qualityTrend,
      taskVelocity: taskVelocitySeries,
    },
    alerts,
  };
}
