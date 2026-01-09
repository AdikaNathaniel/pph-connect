-- Migration: 002 - Add Organizational Structure
-- Created: 2025-10-29
-- Purpose: Add departments table and hierarchical organization fields to profiles table.
--          This enables department-based and hierarchical messaging permissions.
--
-- Changes:
--   1. Create departments table with RLS policies
--   2. Add department_id column to profiles (nullable)
--   3. Add reports_to column to profiles (nullable for hierarchical structure)
--   4. Add indexes for performance
--   5. Add constraint to prevent self-reporting
--
-- Rollback:
--   DROP TABLE IF EXISTS departments CASCADE;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS department_id;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS reports_to;
--
-- Impact: BACKWARD COMPATIBLE
--   - New columns are nullable (no impact on existing profiles)
--   - New table is isolated (no dependencies from existing code)
--   - Existing queries unaffected
--
-- ============================================================================

-- Step 1: Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Add index for departments.manager_id (for efficient manager lookups)
CREATE INDEX IF NOT EXISTS idx_departments_manager_id
  ON public.departments(manager_id);

-- Step 3: Enable Row Level Security on departments table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for departments

-- Policy: Authenticated users can view all departments
CREATE POLICY "Authenticated users can view departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and managers can manage departments
-- Using existing is_root_or_manager helper function
CREATE POLICY "Admins and managers can manage departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (
    public.is_root_or_manager(auth.uid())
  )
  WITH CHECK (
    public.is_root_or_manager(auth.uid())
  );

-- Step 5: Add department_id column to profiles table (nullable)
-- This links a user to their department
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Step 6: Add reports_to column to profiles table (nullable)
-- This creates the hierarchical reporting structure
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 7: Add indexes for the new columns (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_profiles_department_id
  ON public.profiles(department_id);

CREATE INDEX IF NOT EXISTS idx_profiles_reports_to
  ON public.profiles(reports_to);

-- Step 8: Add constraint to prevent self-reporting
-- A user cannot report to themselves
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_no_self_reporting'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT check_no_self_reporting
      CHECK (id != reports_to);
  END IF;
END $$;

-- Migration complete
-- Next: Run test_002_organizational_structure.sql to verify changes
