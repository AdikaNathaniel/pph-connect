-- Migration: Create Quality Metrics Table
-- Created: 2025-11-06
-- Purpose: Track worker/workforce project quality metrics with rolling aggregates.
--
-- Changes:
--   1. Create public.metric_type enum (idempotent)
--   2. Create public.quality_metrics table with foreign keys and metric fields
--   3. Add supporting indexes and RLS policies
--
-- ============================================================================

-- Create metric_type enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_type') THEN
        CREATE TYPE public.metric_type AS ENUM (
          'accuracy',
          'speed',
          'consistency',
          'quality',
          'productivity'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id),
  metric_type public.metric_type NOT NULL,
  metric_value numeric NOT NULL,
  rolling_avg_7d numeric DEFAULT NULL,
  rolling_avg_30d numeric DEFAULT NULL,
  percentile_rank numeric DEFAULT NULL,
  measured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_worker
  ON public.quality_metrics(worker_id);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_project
  ON public.quality_metrics(project_id);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_type
  ON public.quality_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_worker_project_type_measured
  ON public.quality_metrics(worker_id, project_id, metric_type, measured_at);

ALTER TABLE public.quality_metrics
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality metrics"
  ON public.quality_metrics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quality metrics"
  ON public.quality_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  );
