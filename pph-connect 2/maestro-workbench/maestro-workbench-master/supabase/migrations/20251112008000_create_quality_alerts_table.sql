-- Migration: Create Quality Alerts Table
-- Created: 2025-11-12
-- Purpose: Store manager-facing quality alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quality_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  metric_value numeric,
  threshold numeric,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  notified boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_quality_alerts_project
  ON public.quality_alerts(project_id);

CREATE INDEX IF NOT EXISTS idx_quality_alerts_worker
  ON public.quality_alerts(worker_id);

ALTER TABLE public.quality_alerts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality alerts"
  ON public.quality_alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quality alerts"
  ON public.quality_alerts
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
