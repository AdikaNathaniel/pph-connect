-- Combined migration to fix workers table audit fields and RLS policies
-- This migration does two things:
-- 1. Fixes created_by/updated_by to reference auth.users instead of workers
-- 2. Improves RLS policy with a helper function

-- Step 1: Fix the foreign key constraints for audit fields
-- Drop the existing foreign key constraints
ALTER TABLE public.workers
  DROP CONSTRAINT IF EXISTS workers_created_by_fkey;

ALTER TABLE public.workers
  DROP CONSTRAINT IF EXISTS workers_updated_by_fkey;

-- Add new foreign key constraints referencing auth.users
ALTER TABLE public.workers
  ADD CONSTRAINT workers_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

ALTER TABLE public.workers
  ADD CONSTRAINT workers_updated_by_fkey
    FOREIGN KEY (updated_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.workers.created_by IS
  'UUID of the auth user who created this worker record';

COMMENT ON COLUMN public.workers.updated_by IS
  'UUID of the auth user who last updated this worker record';

-- Step 2: Create helper function and improve RLS policy
-- Create a helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('root', 'admin')
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop existing policies to recreate them with the helper function
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;

-- Recreate the admin policy using the helper function for clarity
CREATE POLICY "Admins can manage workers"
  ON public.workers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Add a comment for documentation
COMMENT ON POLICY "Admins can manage workers" ON public.workers IS
  'Allows users with admin or root role in profiles table to manage all worker records';
