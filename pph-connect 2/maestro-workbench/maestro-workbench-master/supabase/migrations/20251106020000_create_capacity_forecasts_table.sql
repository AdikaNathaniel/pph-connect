-- Migration: Create Capacity Forecasts Table
-- Created: 2025-11-06
-- Purpose: Store demand and capacity predictions per project and date.
--
-- Changes:
--   1. Create public.capacity_forecasts table with project foreign key and forecast metrics
--   2. Add indexes to support project/date lookups
--   3. Enable RLS with authenticated read and admin-only write policies
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capacity_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  forecast_date date NOT NULL,
  predicted_demand numeric NOT NULL,
  predicted_capacity numeric NOT NULL,
  confidence_score numeric DEFAULT 0,
  forecast_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_project
  ON public.capacity_forecasts(project_id);

CREATE INDEX IF NOT EXISTS idx_capacity_forecasts_date
  ON public.capacity_forecasts(forecast_date);

ALTER TABLE public.capacity_forecasts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read capacity forecasts"
  ON public.capacity_forecasts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage capacity forecasts"
  ON public.capacity_forecasts
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
