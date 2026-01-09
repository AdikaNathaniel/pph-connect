-- Migration: Create Quality Warnings Table
-- Created: 2025-11-12
-- Purpose: Track automated quality warnings sent to workers.
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quality_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  current_score numeric,
  threshold numeric,
  recommended_actions text[] DEFAULT '{}',
  resolution_due timestamptz,
  message_subject text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quality_warnings_worker
  ON public.quality_warnings(worker_id);

CREATE INDEX IF NOT EXISTS idx_quality_warnings_project
  ON public.quality_warnings(project_id);

ALTER TABLE public.quality_warnings
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quality warnings"
  ON public.quality_warnings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quality warnings"
  ON public.quality_warnings
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
