-- Migration: Create Skill Assessments Table
-- Created: 2025-11-06
-- Purpose: Track worker skill assessment attempts and outcomes.
--
-- Changes:
--   1. Create public.skill_assessments table with foreign keys and metrics
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  skill_name text NOT NULL,
  assessment_type text NOT NULL,
  score numeric DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  taken_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_worker
  ON public.skill_assessments(worker_id);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill
  ON public.skill_assessments(skill_name);

ALTER TABLE public.skill_assessments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read skill assessments"
  ON public.skill_assessments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skill assessments"
  ON public.skill_assessments
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
