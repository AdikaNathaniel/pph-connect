-- Migration: Create Workforce Projects Table
-- Created: 2025-11-06
-- Purpose: Define workforce project records with department linkage, tiering, and audit metadata.
-- Note: Renamed from "projects" to "workforce_projects" to avoid collision with annotation projects table.
--
-- Changes:
--   1. Create project_status and project_expert_tier enums (idempotent)
--   2. Create public.workforce_projects table with unique project_code and audit fields
--
-- ============================================================================

-- Create project_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM (
          'active',
          'paused',
          'completed',
          'cancelled'
        );
    END IF;
END $$;

-- Create project_expert_tier enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_expert_tier') THEN
        CREATE TYPE public.project_expert_tier AS ENUM (
          'tier0',
          'tier1',
          'tier2'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workforce_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id),
  project_code text NOT NULL,
  project_name text NOT NULL,
  expert_tier public.project_expert_tier NOT NULL DEFAULT 'tier0',
  status public.project_status NOT NULL DEFAULT 'active',
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT workforce_projects_project_code_key UNIQUE (project_code)
);

CREATE INDEX IF NOT EXISTS idx_workforce_projects_department
  ON public.workforce_projects(department_id);

CREATE INDEX IF NOT EXISTS idx_workforce_projects_code
  ON public.workforce_projects(project_code);

CREATE INDEX IF NOT EXISTS idx_workforce_projects_status
  ON public.workforce_projects(status);

ALTER TABLE public.workforce_projects
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workforce projects"
  ON public.workforce_projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workforce projects"
  ON public.workforce_projects
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
