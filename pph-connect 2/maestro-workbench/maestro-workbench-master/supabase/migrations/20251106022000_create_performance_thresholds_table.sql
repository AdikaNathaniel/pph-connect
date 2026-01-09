-- Migration: Create Performance Thresholds Table
-- Created: 2025-11-06
-- Purpose: Define workforce project-level performance thresholds and enforcement actions.
--
-- Changes:
--   1. Create public.threshold_action enum (idempotent)
--   2. Create public.performance_thresholds table with foreign keys and enforcement metadata
--   3. Add indexes and RLS policies for secure access
--
-- ============================================================================

-- Create threshold_action enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'threshold_action') THEN
        CREATE TYPE public.threshold_action AS ENUM (
          'warn',
          'restrict',
          'remove'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.performance_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id),
  metric_type public.metric_type NOT NULL,
  threshold_min numeric DEFAULT NULL,
  threshold_max numeric DEFAULT NULL,
  grace_period_days integer DEFAULT 0,
  action_on_violation public.threshold_action NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_thresholds_project
  ON public.performance_thresholds(project_id);

CREATE INDEX IF NOT EXISTS idx_performance_thresholds_metric
  ON public.performance_thresholds(metric_type);

CREATE INDEX IF NOT EXISTS idx_performance_thresholds_project_metric
  ON public.performance_thresholds(project_id, metric_type);

ALTER TABLE public.performance_thresholds
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read performance thresholds"
  ON public.performance_thresholds
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage performance thresholds"
  ON public.performance_thresholds
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
