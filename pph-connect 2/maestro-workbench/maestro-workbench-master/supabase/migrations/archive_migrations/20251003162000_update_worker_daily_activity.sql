-- Update worker_daily_activity view to include project names and richer metrics
CREATE OR REPLACE VIEW public.worker_daily_activity AS
SELECT
  a.worker_id,
  a.project_id,
  p.name AS project_name,
  a.completion_time::DATE AS activity_date,
  COUNT(*)::INTEGER AS tasks_completed,
  COALESCE(SUM(a.aht_seconds), 0)::INTEGER AS total_answer_time_seconds,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(SUM(a.aht_seconds)::NUMERIC / COUNT(*), 2)
    ELSE NULL
  END AS avg_answer_time_seconds
FROM public.answers a
LEFT JOIN public.projects p ON p.id = a.project_id
GROUP BY a.worker_id, a.project_id, p.name, a.completion_time::DATE;

COMMENT ON VIEW public.worker_daily_activity IS
  'Per-worker, per-project activity counts by day including project names and answer time metrics.';
