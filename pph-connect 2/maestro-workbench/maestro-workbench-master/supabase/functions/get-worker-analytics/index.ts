// DEPRECATED - see useWorkerAnalytics hook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, tryHandleCors } from '../_shared/cors.ts';

interface WorkerAnalyticsSummary {
  worker_id: string;
  total_completed_tasks: number;
  distinct_projects: number;
  tasks_last_24h: number;
  tasks_today: number;
  total_active_seconds: number;
  avg_aht_seconds: number | null;
  first_active_at: string | null;
  last_active_at: string | null;
}

interface WorkerDailyActivity {
  activity_date: string;
  project_id: string;
  project_name: string | null;
  tasks_completed: number;
  total_answer_time_seconds: number;
  avg_answer_time_seconds: number;
}

interface WorkerProjectPerformance {
  worker_id: string;
  project_id: string;
  tasks_completed: number;
  total_active_seconds: number;
  avg_aht_seconds: number | null;
  first_active_at: string | null;
  last_active_at: string | null;
}

interface WorkerPluginMetric {
  plugin_type: string;
  metric_key: string;
  metric_value: number;
  metric_unit: string | null;
  metric_metadata: Record<string, unknown>;
  recorded_at: string;
}

interface WorkerAnalyticsResponse {
  summary: WorkerAnalyticsSummary | null;
  dailyActivity: WorkerDailyActivity[];
  projectPerformance: WorkerProjectPerformance[];
  pluginMetrics: Record<string, WorkerPluginMetric[]>;
  globalSnapshot: GlobalAnalyticsSnapshot | null;
}

type WorkerSummaryRow = {
  total_completed_tasks: number | null;
  total_active_seconds: number | null;
  avg_aht_seconds: number | null;
  distinct_projects: number | null;
  first_active_at: string | null;
  last_active_at: string | null;
};

interface GlobalAnalyticsSnapshot {
  total_answers: number;
  active_projects: number;
  total_workers: number;
  pending_questions: number;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment configuration');
}

const supabase = createClient(supabaseUrl ?? '', serviceRoleKey ?? '', {
  auth: { persistSession: false },
});

serve(async (request: Request) => {
  const corsResponse = tryHandleCors(request);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();
    const startOfTomorrowIso = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoIsoDate = thirtyDaysAgoDate.toISOString().slice(0, 10);

    const { data: summaryRow, error: summaryError } = await supabase
      .from('answers')
      .select(`
        total_completed_tasks:count(id),
        total_active_seconds:coalesce(sum(aht_seconds), 0),
        avg_aht_seconds:avg(aht_seconds),
        distinct_projects:count(distinct project_id),
        first_active_at:min(start_time),
        last_active_at:max(completion_time)
      `)
      .eq('worker_id', user.id)
      .maybeSingle();

    if (summaryError) {
      throw summaryError;
    }

    const {
      total_completed_tasks = 0,
      total_active_seconds = 0,
      avg_aht_seconds = null,
      distinct_projects = 0,
      first_active_at = null,
      last_active_at = null,
    } = (summaryRow as WorkerSummaryRow | null) ?? {};

    const { count: tasksTodayCount, error: tasksTodayError } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', user.id)
      .gte('completion_time', startOfTodayIso)
      .lt('completion_time', startOfTomorrowIso);

    if (tasksTodayError) {
      throw tasksTodayError;
    }

    const { count: tasksLast24hCount, error: tasksLast24hError } = await supabase
      .from('answers')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', user.id)
      .gte('completion_time', twentyFourHoursAgoIso);

    if (tasksLast24hError) {
      throw tasksLast24hError;
    }

    const { data: dailyActivityData, error: dailyActivityError } = await supabase
      .from('worker_daily_activity')
      .select('activity_date, project_id, project_name, tasks_completed, total_answer_time_seconds, avg_answer_time_seconds')
      .eq('worker_id', user.id)
      .gte('activity_date', thirtyDaysAgoIsoDate)
      .order('activity_date', { ascending: true });

    if (dailyActivityError) {
      throw dailyActivityError;
    }

    const dailyActivity: WorkerDailyActivity[] = (dailyActivityData ?? []).map((item) => ({
      activity_date: item.activity_date,
      project_id: item.project_id,
      project_name: item.project_name,
      tasks_completed: typeof item.tasks_completed === 'number' ? item.tasks_completed : Number(item.tasks_completed ?? 0),
      total_answer_time_seconds: typeof item.total_answer_time_seconds === 'number' ? item.total_answer_time_seconds : Number(item.total_answer_time_seconds ?? 0),
      avg_answer_time_seconds: typeof item.avg_answer_time_seconds === 'number' ? item.avg_answer_time_seconds : Number(item.avg_answer_time_seconds ?? 0),
    }));

    const summary: WorkerAnalyticsSummary = {
      worker_id: user.id,
      total_completed_tasks: typeof total_completed_tasks === 'number' ? total_completed_tasks : Number(total_completed_tasks ?? 0),
      distinct_projects: typeof distinct_projects === 'number' ? distinct_projects : Number(distinct_projects ?? 0),
      tasks_last_24h: tasksLast24hCount ?? 0,
      tasks_today: tasksTodayCount ?? 0,
      total_active_seconds: typeof total_active_seconds === 'number' ? Math.round(total_active_seconds ?? 0) : Math.round(Number(total_active_seconds ?? 0)),
      avg_aht_seconds: avg_aht_seconds === null ? null : Number(avg_aht_seconds),
      first_active_at: first_active_at,
      last_active_at: last_active_at,
    };

    const { count: totalAnswers } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true });

    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalWorkers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'worker');

    const { count: activeQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_answered', false);

    const globalSnapshot: GlobalAnalyticsSnapshot = {
      total_answers: totalAnswers ?? 0,
      active_projects: activeProjects ?? 0,
      total_workers: totalWorkers ?? 0,
      pending_questions: activeQuestions ?? 0,
    };

    const { data: projectPerformance } = await supabase
      .from<WorkerProjectPerformance>('worker_project_performance')
      .select('*')
      .eq('worker_id', user.id)
      .order('tasks_completed', { ascending: false });

    const { data: pluginMetrics } = await supabase
      .from<WorkerPluginMetric>('worker_plugin_metrics')
      .select('*')
      .eq('worker_id', user.id)
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    const response: WorkerAnalyticsResponse = {
      summary,
      dailyActivity,
      globalSnapshot,
      projectPerformance: projectPerformance ?? [],
      pluginMetrics: (pluginMetrics ?? []).reduce<Record<string, WorkerPluginMetric[]>>(
        (acc, metric) => {
          const bucket = acc[metric.plugin_type] ?? [];
          bucket.push(metric);
          acc[metric.plugin_type] = bucket;
          return acc;
        },
        {},
      ),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('get-worker-analytics error', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch worker analytics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

