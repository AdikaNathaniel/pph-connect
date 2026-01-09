import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  WorkerAnalyticsSummary,
  WorkerDailyActivity,
  WorkerProjectPerformance,
  GlobalAnalyticsSnapshot,
} from '@/integrations/supabase/types';

interface WorkerAnalyticsResponse {
  summary: WorkerAnalyticsSummary | null;
  dailyActivity: WorkerDailyActivity[];
  projectPerformance: WorkerProjectPerformance[];
  pluginMetrics: Record<string, unknown>;
  globalSnapshot: GlobalAnalyticsSnapshot | null;
}

interface UseWorkerAnalyticsResult {
  data: WorkerAnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const initialData: WorkerAnalyticsResponse = {
  summary: null,
  dailyActivity: [],
  projectPerformance: [],
  pluginMetrics: {},
  globalSnapshot: null,
};

const TIME_ZONE = 'America/New_York';
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const getEasternDayBoundaries = (date: Date) => {
  const localeString = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
  const timezoneDate = new Date(localeString);
  timezoneDate.setHours(0, 0, 0, 0);

  const offsetMs = date.getTime() - new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const startUtc = new Date(timezoneDate.getTime() - offsetMs);
  const endUtc = new Date(startUtc.getTime() + MS_IN_DAY);

  return {
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString(),
  };
};

export const useWorkerAnalytics = (workerId?: string): UseWorkerAnalyticsResult => {
  const [data, setData] = useState<WorkerAnalyticsResponse | null>(initialData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!workerId) {
      setData(initialData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const { startUtcIso: startOfTodayIso, endUtcIso: endOfTodayIso } = getEasternDayBoundaries(now);
      const twentyFourHoursAgoIso = new Date(now.getTime() - MS_IN_DAY).toISOString();
      const thirtyDaysAgoIsoDate = new Date(now.getTime() - 30 * MS_IN_DAY).toISOString().slice(0, 10);

      const [answersResult, dailyActivityResult] = await Promise.all([
        supabase
          .from('answers')
          .select('id, project_id, start_time, completion_time, aht_seconds')
          .eq('worker_id', workerId)
          .order('completion_time', { ascending: false }),
        supabase
          .from('worker_daily_activity')
          .select('activity_date, project_id, project_name, tasks_completed, total_answer_time_seconds, avg_answer_time_seconds')
          .eq('worker_id', workerId)
          .gte('activity_date', thirtyDaysAgoIsoDate)
          .order('activity_date', { ascending: false }),
      ]);

      if (answersResult.error) {
        console.error('Failed to fetch worker answers', answersResult.error);
        throw answersResult.error;
      }

      if (dailyActivityResult.error) {
        console.error('Failed to fetch worker daily activity', dailyActivityResult.error);
      }

      const answers = answersResult.data ?? [];

      const totalCompletedTasks = answers.length;
      const totalActiveSeconds = answers.reduce((acc, answer) => acc + (answer.aht_seconds ?? 0), 0);
      const avgAhtSeconds = totalCompletedTasks > 0 ? Math.round(totalActiveSeconds / totalCompletedTasks) : null;
      const distinctProjects = new Set(answers.map((answer) => answer.project_id).filter(Boolean)).size;

      const twentyFourHoursAgo = new Date(twentyFourHoursAgoIso);
      const tasksLast24h = answers.filter((answer) => {
        if (!answer.completion_time) return false;
        const completionDate = new Date(answer.completion_time);
        return completionDate >= twentyFourHoursAgo;
      }).length;

      const tasksToday = answers.filter((answer) => {
        if (!answer.completion_time) return false;
        const completionDate = new Date(answer.completion_time);
        return completionDate >= new Date(startOfTodayIso) && completionDate < new Date(endOfTodayIso);
      }).length;

      const firstActiveAt = answers.reduce<string | null>((earliest, answer) => {
        const candidate = answer.start_time ?? answer.completion_time;
        if (!candidate) return earliest;
        if (!earliest || new Date(candidate) < new Date(earliest)) {
          return candidate;
        }
        return earliest;
      }, null);

      const lastActiveAt = answers.reduce<string | null>((latest, answer) => {
        const candidate = answer.completion_time ?? answer.start_time;
        if (!candidate) return latest;
        if (!latest || new Date(candidate) > new Date(latest)) {
          return candidate;
        }
        return latest;
      }, null);

      const dailyActivity: WorkerDailyActivity[] = (dailyActivityResult.data ?? []).map((item) => ({
        activity_date: item.activity_date,
        project_id: item.project_id,
        project_name: item.project_name,
        tasks_completed: Number(item.tasks_completed ?? 0),
        total_answer_time_seconds: Number(item.total_answer_time_seconds ?? 0),
        avg_answer_time_seconds: item.avg_answer_time_seconds == null ? 0 : Number(item.avg_answer_time_seconds ?? 0),
      }));

      const globalSnapshot: GlobalAnalyticsSnapshot | null = null;

      const summary: WorkerAnalyticsSummary = {
        worker_id: workerId,
        total_completed_tasks: totalCompletedTasks,
        distinct_projects: distinctProjects,
        tasks_last_24h: tasksLast24h,
        tasks_today: tasksToday,
        total_active_seconds: Math.round(totalActiveSeconds),
        avg_aht_seconds: avgAhtSeconds,
        first_active_at: firstActiveAt,
        last_active_at: lastActiveAt,
      };

      console.log('Worker analytics response received:', {
        workerId,
        totalCompletedTasks,
        tasksToday,
        tasksLast24h,
        distinctProjects,
        totalActiveSeconds,
        dailyActivityCount: dailyActivity.length,
      });

      setData({
        summary,
        dailyActivity,
        projectPerformance: [],
        pluginMetrics: {},
        globalSnapshot,
      });
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error fetching worker analytics', err);
      setError('Failed to load analytics. Please try again later.');
      setData(initialData);
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refresh: fetchAnalytics,
  };
};

