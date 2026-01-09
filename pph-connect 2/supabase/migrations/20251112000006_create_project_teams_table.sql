-- Migration: Create Project Teams Junction Table
-- Created: 2025-11-06
-- Purpose: Link workforce projects and teams via junction table for many-to-many relationships.
--
-- Changes:
--   1. Create public.project_teams table with cascaded foreign keys
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT project_teams_project_id_team_id_key UNIQUE (project_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_project_teams_project
  ON public.project_teams(project_id);

CREATE INDEX IF NOT EXISTS idx_project_teams_team
  ON public.project_teams(team_id);

ALTER TABLE public.project_teams
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project teams"
  ON public.project_teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage project teams"
  ON public.project_teams
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
