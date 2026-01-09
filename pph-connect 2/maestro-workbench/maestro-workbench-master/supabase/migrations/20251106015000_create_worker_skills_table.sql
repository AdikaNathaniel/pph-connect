-- Migration: Create Worker Skills Table
-- Created: 2025-11-06
-- Purpose: Track worker skill metadata with proficiency and verification.
--
-- Changes:
--   1. Create skill_category and proficiency_level enums
--   2. Create public.worker_skills table
--
-- ============================================================================

-- Create skill_category enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_category') THEN
        CREATE TYPE public.skill_category AS ENUM (
          'STEM',
          'legal',
          'creative',
          'operations',
          'language',
          'other'
        );
    END IF;
END $$;

-- Create proficiency_level enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proficiency_level') THEN
        CREATE TYPE public.proficiency_level AS ENUM (
          'novice',
          'intermediate',
          'advanced',
          'expert'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.worker_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  skill_name text NOT NULL,
  skill_category public.skill_category NOT NULL,
  proficiency_level public.proficiency_level NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz DEFAULT NULL,
  verified_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_skills_worker
  ON public.worker_skills(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_skills_category
  ON public.worker_skills(skill_category);

ALTER TABLE public.worker_skills
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker skills"
  ON public.worker_skills
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker skills"
  ON public.worker_skills
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
