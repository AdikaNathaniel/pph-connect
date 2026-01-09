-- Migration: Create Skill Verifications Table
-- Created: 2025-11-06
-- Purpose: Store AI/manual skill verification results for workers.
--
-- Changes:
--   1. Create public.skill_verifications table with worker foreign key and verification metadata
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  skill_name text NOT NULL,
  verification_type text NOT NULL,
  verification_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric DEFAULT 0,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_verifications_worker
  ON public.skill_verifications(worker_id);

CREATE INDEX IF NOT EXISTS idx_skill_verifications_skill
  ON public.skill_verifications(skill_name);

ALTER TABLE public.skill_verifications
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read skill verifications"
  ON public.skill_verifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skill verifications"
  ON public.skill_verifications
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
