-- Worker analytics foundational structures

-- View consolidating per-worker aggregate metrics sourced from answers
CREATE OR REPLACE VIEW public.worker_analytics_summary AS
SELECT
  a.worker_id,
  COUNT(*)::INTEGER AS total_completed_tasks,
  COUNT(DISTINCT a.project_id)::INTEGER AS distinct_projects,
  COUNT(*) FILTER (WHERE a.completion_time >= (now() - INTERVAL '24 hours'))::INTEGER AS tasks_last_24h,
  COUNT(*) FILTER (WHERE a.completion_time::DATE = current_date)::INTEGER AS tasks_today,
  COALESCE(SUM(a.aht_seconds), 0)::INTEGER AS total_active_seconds,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(SUM(a.aht_seconds)::NUMERIC / COUNT(*), 2)
    ELSE NULL
  END AS avg_aht_seconds,
  MIN(a.start_time) AS first_active_at,
  MAX(a.completion_time) AS last_active_at
FROM public.answers a
GROUP BY a.worker_id;

COMMENT ON VIEW public.worker_analytics_summary IS
  'Core worker analytics aggregates derived from answers; respects answers RLS policies.';

-- Daily rollup view to power streaks and charts
CREATE OR REPLACE VIEW public.worker_daily_activity AS
SELECT
  a.worker_id,
  a.project_id,
  a.completion_time::DATE AS activity_date,
  COUNT(*)::INTEGER AS tasks_completed,
  COALESCE(SUM(a.aht_seconds), 0)::INTEGER AS total_active_seconds
FROM public.answers a
GROUP BY a.worker_id, a.project_id, a.completion_time::DATE;

COMMENT ON VIEW public.worker_daily_activity IS
  'Per-worker, per-project activity counts by day for lightweight charting.';

-- Project breakdown view for detailed analytics tables
CREATE OR REPLACE VIEW public.worker_project_performance AS
SELECT
  a.worker_id,
  a.project_id,
  COUNT(*)::INTEGER AS tasks_completed,
  COALESCE(SUM(a.aht_seconds), 0)::INTEGER AS total_active_seconds,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(SUM(a.aht_seconds)::NUMERIC / COUNT(*), 2)
    ELSE NULL
  END AS avg_aht_seconds,
  MIN(a.start_time) AS first_active_at,
  MAX(a.completion_time) AS last_active_at
FROM public.answers a
GROUP BY a.worker_id, a.project_id;

COMMENT ON VIEW public.worker_project_performance IS
  'Per-project performance breakdown for each worker.';

-- Generic plugin metric table for future extensibility
CREATE TABLE IF NOT EXISTS public.worker_plugin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plugin_type TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  metric_metadata JSONB NOT NULL DEFAULT '{}',
  recorded_at DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_plugin_metrics_worker_id ON public.worker_plugin_metrics(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_plugin_metrics_plugin_date ON public.worker_plugin_metrics(plugin_type, recorded_at);

ALTER TABLE public.worker_plugin_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Workers can view their plugin metrics" ON public.worker_plugin_metrics;
CREATE POLICY "Workers can view their plugin metrics"
  ON public.worker_plugin_metrics
  FOR SELECT
  USING (worker_id = auth.uid());

DROP POLICY IF EXISTS "Workers can manage their plugin metrics" ON public.worker_plugin_metrics;
CREATE POLICY "Workers can manage their plugin metrics"
  ON public.worker_plugin_metrics
  FOR ALL
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS "Managers can view all plugin metrics" ON public.worker_plugin_metrics;
CREATE POLICY "Managers can view all plugin metrics"
  ON public.worker_plugin_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('manager', 'root')
    )
  );

COMMENT ON TABLE public.worker_plugin_metrics IS
  'Extensible storage for plugin-specific worker analytics (e.g., audio minutes processed).';


