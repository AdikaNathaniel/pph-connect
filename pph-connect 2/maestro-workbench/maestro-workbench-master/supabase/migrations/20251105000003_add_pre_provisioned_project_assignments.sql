-- Migration: Add Pre-Provisioned Project Assignments
-- Created: 2025-11-05
-- Purpose: Allow managers to assign projects to pre-provisioned users (before OAuth sign-in)
--          Assignments are migrated to project_assignments table when user signs in
--
-- Changes:
--   1. Create pre_provisioned_project_assignments table
--   2. Add RLS policies for managers
--   3. Add indexes for performance
--
-- ============================================================================

-- Step 1: Create pre_provisioned_project_assignments table
CREATE TABLE IF NOT EXISTS public.pre_provisioned_project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_provisioned_user_id uuid NOT NULL REFERENCES public.pre_provisioned_users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Prevent duplicate assignments
  UNIQUE(pre_provisioned_user_id, project_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.pre_provisioned_project_assignments IS
'Project assignments for pre-provisioned users awaiting OAuth sign-in. When user signs in, assignments are migrated to project_assignments table.';

COMMENT ON COLUMN public.pre_provisioned_project_assignments.pre_provisioned_user_id IS
'Reference to pre-provisioned user (before they have a profiles entry)';

COMMENT ON COLUMN public.pre_provisioned_project_assignments.project_id IS
'Project the user will be assigned to after sign-in';

COMMENT ON COLUMN public.pre_provisioned_project_assignments.assigned_by IS
'Manager who made the assignment';

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_pre_provisioned_project_assignments_user
  ON public.pre_provisioned_project_assignments(pre_provisioned_user_id);

CREATE INDEX IF NOT EXISTS idx_pre_provisioned_project_assignments_project
  ON public.pre_provisioned_project_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_pre_provisioned_project_assignments_assigned_by
  ON public.pre_provisioned_project_assignments(assigned_by);

-- Step 3: Enable Row Level Security
ALTER TABLE public.pre_provisioned_project_assignments ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Policy: Root and managers can view all pre-provisioned assignments
CREATE POLICY "Root and managers can view pre-provisioned assignments"
  ON public.pre_provisioned_project_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can insert pre-provisioned assignments
CREATE POLICY "Root and managers can insert pre-provisioned assignments"
  ON public.pre_provisioned_project_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can update pre-provisioned assignments
CREATE POLICY "Root and managers can update pre-provisioned assignments"
  ON public.pre_provisioned_project_assignments
  FOR UPDATE
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()))
  WITH CHECK (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can delete pre-provisioned assignments
CREATE POLICY "Root and managers can delete pre-provisioned assignments"
  ON public.pre_provisioned_project_assignments
  FOR DELETE
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()));

-- Step 5: Add trigger for updated_at
CREATE TRIGGER update_pre_provisioned_project_assignments_updated_at
  BEFORE UPDATE ON public.pre_provisioned_project_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
-- Managers can now assign projects to pre-provisioned users
-- Assignments will be migrated to project_assignments when user signs in via OAuth
