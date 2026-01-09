-- Migration: Add Pre-Provisioned Users Table
-- Created: 2025-11-05
-- Purpose: Support bulk CSV import for OAuth user pre-provisioning
--          Allows managers to pre-configure users before they sign in with OAuth
--
-- Changes:
--   1. Create pre_provisioned_users table
--   2. Add RLS policies for managers
--   3. Add trigger to clean up after OAuth linking
--
-- ============================================================================

-- Step 1: Create pre_provisioned_users table
CREATE TABLE IF NOT EXISTS public.pre_provisioned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'worker',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  provisioned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provisioned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.pre_provisioned_users IS
'Pre-provisioned users awaiting OAuth sign-in. When a user signs in with OAuth, their email is matched against this table to assign pre-configured role and department.';

COMMENT ON COLUMN public.pre_provisioned_users.email IS
'Email address that will be matched during OAuth sign-in';

COMMENT ON COLUMN public.pre_provisioned_users.role IS
'Role to assign when user signs in (default: worker)';

COMMENT ON COLUMN public.pre_provisioned_users.department_id IS
'Department to assign when user signs in';

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_pre_provisioned_users_email
  ON public.pre_provisioned_users(email);

CREATE INDEX IF NOT EXISTS idx_pre_provisioned_users_provisioned_by
  ON public.pre_provisioned_users(provisioned_by);

-- Step 3: Enable Row Level Security
ALTER TABLE public.pre_provisioned_users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Policy: Root and managers can view all pre-provisioned users
CREATE POLICY "Root and managers can view pre-provisioned users"
  ON public.pre_provisioned_users
  FOR SELECT
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can insert pre-provisioned users
CREATE POLICY "Root and managers can insert pre-provisioned users"
  ON public.pre_provisioned_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can update pre-provisioned users
CREATE POLICY "Root and managers can update pre-provisioned users"
  ON public.pre_provisioned_users
  FOR UPDATE
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()))
  WITH CHECK (public.is_root_or_manager(auth.uid()));

-- Policy: Root and managers can delete pre-provisioned users
CREATE POLICY "Root and managers can delete pre-provisioned users"
  ON public.pre_provisioned_users
  FOR DELETE
  TO authenticated
  USING (public.is_root_or_manager(auth.uid()));

-- Step 5: Add trigger for updated_at
CREATE TRIGGER update_pre_provisioned_users_updated_at
  BEFORE UPDATE ON public.pre_provisioned_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
-- Managers can now pre-provision users via CSV upload
-- Users will be matched by email during OAuth sign-in
