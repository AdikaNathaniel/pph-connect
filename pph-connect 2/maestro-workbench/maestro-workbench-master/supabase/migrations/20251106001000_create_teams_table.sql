-- Migration: Create Teams Table
-- Created: 2025-11-06
-- Purpose: Introduce teams entity with locale configuration linked to departments.
--
-- Changes:
--   1. Create public.teams table with core columns.
--
-- ============================================================================ 

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL,
  team_name text NOT NULL,
  locale_primary text NOT NULL,
  locale_secondary text DEFAULT NULL,
  locale_region text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams
  ADD CONSTRAINT teams_department_id_fkey
    FOREIGN KEY (department_id)
    REFERENCES public.departments(id)
    ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_teams_department
  ON public.teams(department_id);

CREATE INDEX IF NOT EXISTS idx_teams_locale
  ON public.teams(locale_primary, locale_region);

CREATE INDEX IF NOT EXISTS idx_teams_active
  ON public.teams(is_active);

ALTER TABLE public.teams
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage teams"
  ON public.teams
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

ALTER TABLE public.teams
  ADD CONSTRAINT teams_locale_primary_check
    CHECK (locale_primary ~ '^[a-z]{2}$');

ALTER TABLE public.teams
  ADD CONSTRAINT teams_locale_secondary_check
    CHECK (locale_secondary IS NULL OR locale_secondary ~ '^[a-z]{2}$');

ALTER TABLE public.teams
  ADD CONSTRAINT teams_locale_region_check
    CHECK (locale_region IS NULL OR locale_region ~ '^[A-Z]{2}$');
