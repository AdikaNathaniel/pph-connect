-- Migration: Fix Profile Insert Policy for OAuth Users
-- Created: 2025-11-05
-- Purpose: Allow new users to create their own profile during OAuth signup
--          The existing policy only allowed root/managers to insert profiles,
--          which blocked OAuth users from signing up.
--
-- Changes:
--   1. Add policy allowing users to insert their own profile (id = auth.uid())
--   2. Keep existing policy for managers to create profiles for others
--
-- Security: Users can only create a profile for themselves (id must match auth.uid())
-- ============================================================================

-- Add policy to allow users to create their own profile
-- This is triggered by the handle_new_user() function during OAuth signup
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Add comment for documentation
COMMENT ON POLICY "Users can create their own profile" ON public.profiles IS
'Allows new users to create their own profile during OAuth signup. User can only insert a profile where id matches their auth.uid().';

-- Migration complete
-- New OAuth users can now successfully create their profile
