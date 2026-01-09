-- ============================================================================
-- PPH Connect Database Schema Setup
-- Created: 2025-11-12
-- Purpose: Apply all core workforce management tables to Supabase database
--
-- This script combines 7 core migrations from Maestro in the correct order:
--   1. Update departments schema
--   2. Create teams table
--   3. Create workers table
--   4. Create worker_accounts table
--   5. Create workforce_projects table
--   6. Create project_teams junction table
--   7. Create worker_assignments table
--
-- Prerequisites:
--   - departments table must exist (from Maestro)
--   - profiles table must exist (from Maestro)
--   - Baseline migration (20251112000000) must be applied
--
-- Run this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- MIGRATION 1: Update Departments Schema
-- Source: 20251106000000_update_departments_schema.sql
-- ============================================================================

-- Step 1: Rename name -> department_name to match new schema terminology
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'departments'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.departments
      RENAME COLUMN name TO department_name;
  END IF;
END $$;

-- Step 2: Add department_code column with default generator
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS department_code TEXT;

-- Populate department_code for existing rows (idempotent)
UPDATE public.departments
SET department_code = CONCAT('DEPT_', UPPER(SUBSTRING(id::text, 1, 8)))
WHERE department_code IS NULL;

-- Ensure department_code is always populated and unique
ALTER TABLE public.departments
  ALTER COLUMN department_code SET NOT NULL;

ALTER TABLE public.departments
  ALTER COLUMN department_code
    SET DEFAULT CONCAT('DEPT_', UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.departments'::regclass
      AND conname = 'departments_department_code_key'
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_department_code_key
        UNIQUE (department_code);
  END IF;
END $$;

-- Step 3: Add is_active flag to support soft deletes / deactivation
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Step 4: Create supporting indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_code
  ON public.departments(department_code);

CREATE INDEX IF NOT EXISTS idx_departments_active
  ON public.departments(is_active);

-- Step 5: Refresh RLS policies to align with admin-only write requirement
ALTER TABLE public.departments
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'departments'
      AND policyname = 'Admins and managers can manage departments'
  ) THEN
    DROP POLICY "Admins and managers can manage departments"
      ON public.departments;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'departments'
      AND policyname = 'Authenticated users can view departments'
  ) THEN
    DROP POLICY "Authenticated users can view departments"
      ON public.departments;
  END IF;
END $$;

CREATE POLICY "Authenticated users can read departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments
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

-- ============================================================================
-- MIGRATION 2: Create Teams Table
-- Source: 20251106001000_create_teams_table.sql
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

-- ============================================================================
-- MIGRATION 3: Create Workers Table
-- Source: 20251106002000_create_workers_table.sql
-- ============================================================================

-- Create engagement_model enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_model') THEN
        CREATE TYPE public.engagement_model AS ENUM (
          'core',
          'upwork',
          'external',
          'internal'
        );
    END IF;
END $$;

-- Create worker_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
        CREATE TYPE public.worker_status AS ENUM (
          'pending',
          'active',
          'inactive',
          'terminated'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id text NOT NULL,
  full_name text NOT NULL,
  engagement_model public.engagement_model NOT NULL,
  worker_role text DEFAULT NULL,
  email_personal text NOT NULL,
  email_pph text DEFAULT NULL,
  country_residence text NOT NULL,
  locale_primary text NOT NULL,
  locale_all text[] NOT NULL DEFAULT '{}',
  hire_date date NOT NULL,
  rtw_datetime timestamptz DEFAULT NULL,
  supervisor_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  termination_date date DEFAULT NULL,
  bgc_expiration_date date DEFAULT NULL,
  status public.worker_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT workers_hr_id_key UNIQUE (hr_id),
  CONSTRAINT workers_email_personal_key UNIQUE (email_personal),
  CONSTRAINT workers_email_pph_key UNIQUE (email_pph)
);

CREATE INDEX IF NOT EXISTS idx_workers_hr_id
  ON public.workers(hr_id);

CREATE INDEX IF NOT EXISTS idx_workers_status
  ON public.workers(status);

CREATE INDEX IF NOT EXISTS idx_workers_supervisor
  ON public.workers(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_workers_email
  ON public.workers(email_personal);

ALTER TABLE public.workers
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workers"
  ON public.workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workers"
  ON public.workers
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

ALTER TABLE public.workers
  ADD CONSTRAINT workers_no_self_supervision_check
    CHECK (supervisor_id IS NULL OR supervisor_id <> id);

ALTER TABLE public.workers
  ADD CONSTRAINT workers_status_requirements_check
    CHECK (
      (status = 'pending' AND rtw_datetime IS NULL AND termination_date IS NULL)
      OR (status IN ('active', 'inactive') AND rtw_datetime IS NOT NULL AND termination_date IS NULL)
      OR (status = 'terminated' AND termination_date IS NOT NULL AND rtw_datetime IS NOT NULL)
    );

-- ============================================================================
-- MIGRATION 4: Create Worker Accounts Table
-- Source: 20251106003000_create_worker_accounts_table.sql
-- ============================================================================

-- Create platform_type enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
        CREATE TYPE public.platform_type AS ENUM (
          'DataCompute',
          'Maestro',
          'Other'
        );
    END IF;
END $$;

-- Create worker_account_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_account_status') THEN
        CREATE TYPE public.worker_account_status AS ENUM (
          'active',
          'inactive',
          'replaced'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.worker_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  worker_account_email text NOT NULL,
  worker_account_id text NOT NULL,
  platform_type public.platform_type NOT NULL,
  status public.worker_account_status NOT NULL DEFAULT 'active',
  is_current boolean NOT NULL DEFAULT false,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz DEFAULT NULL,
  deactivation_reason text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

-- Create partial unique index to enforce only one current account per worker+platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_accounts_current_unique
  ON public.worker_accounts(worker_id, platform_type)
  WHERE is_current = true;

ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_active_current_check
    CHECK (status <> 'active' OR is_current = true);

ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_deactivated_at_check
    CHECK (deactivated_at IS NULL OR status <> 'active');

CREATE INDEX IF NOT EXISTS idx_worker_accounts_worker
  ON public.worker_accounts(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_accounts_current
  ON public.worker_accounts(worker_id)
  WHERE is_current = true;

ALTER TABLE public.worker_accounts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker accounts"
  ON public.worker_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker accounts"
  ON public.worker_accounts
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

-- ============================================================================
-- MIGRATION 5: Create Workforce Projects Table
-- Source: 20251106004000_create_projects_table.sql
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

-- ============================================================================
-- MIGRATION 6: Create Project Teams Junction Table
-- Source: 20251106005000_create_project_teams_table.sql
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

-- ============================================================================
-- MIGRATION 7: Create Worker Assignments Table
-- Source: 20251106006000_create_worker_assignments_table.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.worker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  removed_at timestamptz DEFAULT NULL,
  removed_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker
  ON public.worker_assignments(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_project
  ON public.worker_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_active
  ON public.worker_assignments(worker_id)
  WHERE removed_at IS NULL;

ALTER TABLE public.worker_assignments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker assignments"
  ON public.worker_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker assignments"
  ON public.worker_assignments
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

COMMIT;

-- ============================================================================
-- Verification Queries
-- Run these after the migration to verify everything was created successfully
-- ============================================================================

-- Verify all tables exist
SELECT
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') as has_departments,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') as has_teams,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workers') as has_workers,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_accounts') as has_worker_accounts,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workforce_projects') as has_workforce_projects,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_teams') as has_project_teams,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'worker_assignments') as has_worker_assignments;

-- List all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('departments', 'teams', 'workers', 'worker_accounts', 'workforce_projects', 'project_teams', 'worker_assignments')
ORDER BY tablename;

-- Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
