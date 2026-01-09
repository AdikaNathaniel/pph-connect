-- Migration: Add required qualifications to projects
-- Created: 2025-11-15
-- Purpose: Track qualifications (keys) needed before workers can join projects.
-- ============================================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS required_qualifications jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.required_qualifications IS 'List of qualification identifiers required to access the project.';

CREATE INDEX IF NOT EXISTS idx_projects_required_qualifications
  ON public.projects
  USING gin (required_qualifications);
