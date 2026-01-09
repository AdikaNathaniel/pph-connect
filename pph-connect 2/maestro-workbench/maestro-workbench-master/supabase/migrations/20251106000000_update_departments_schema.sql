-- Migration: Update Departments Schema
-- Created: 2025-11-06
-- Purpose: Align departments table with PPH Connect phase 1 requirements.
--          Adds business-friendly columns, unique identifiers, and state flags.
--
-- Changes:
--   1. Rename legacy name column to department_name
--   2. Add department_code (unique, not null) with deterministic default
--   3. Add is_active flag for soft enable/disable workflows
--
-- Rollback considerations:
--   - Renaming columns is idempotent; guarded checks prevent duplicate operations
--   - New columns can be dropped if required (handled in rollback migration section)
--
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

-- Rollback: DROP INDEX IF EXISTS idx_departments_code;
-- Rollback: DROP INDEX IF EXISTS idx_departments_active;
-- Rollback: ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_department_code_key;
-- Rollback: ALTER TABLE public.departments DROP COLUMN IF EXISTS department_code;
-- Rollback: ALTER TABLE public.departments DROP COLUMN IF EXISTS is_active;
-- Rollback: ALTER TABLE public.departments RENAME COLUMN department_name TO name;
