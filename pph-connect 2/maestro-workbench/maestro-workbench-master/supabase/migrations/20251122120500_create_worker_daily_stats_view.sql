-- Migration: Create worker_daily_stats view
-- Created: 2025-11-22
-- Purpose: Provide pre-aggregated daily totals for worker analytics dashboards.

CREATE OR REPLACE VIEW public.worker_daily_stats AS
SELECT
  worker_id,
  work_date::date AS work_date,
  SUM(units_completed) AS units,
  SUM(hours_worked) AS hours,
  SUM(earnings) AS earnings
FROM public.work_stats
GROUP BY worker_id, work_date::date;

COMMENT ON VIEW public.worker_daily_stats IS
  'Aggregated daily totals derived from work_stats for analytics workloads.';
