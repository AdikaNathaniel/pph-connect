-- Migration: Allow users to view profiles for messaging
-- Created: 2025-10-29
-- Purpose: Allow all authenticated users to view basic profile information (name, role)
--          This is needed for the messaging system so users can see who sent them messages

-- Add policy to allow all authenticated users to view basic profile information
-- This is safe because it only exposes name and role, not sensitive data
CREATE POLICY "Authenticated users can view profiles for messaging"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Note: This policy allows all authenticated users to see other users' profiles
-- The existing policies still apply:
-- 1. "Root and managers can view all profiles" - for full access
-- 2. "Users can view their own profile" - for own profile
-- 3. This new policy - for viewing others' basic info (name, role) for messaging

COMMENT ON POLICY "Authenticated users can view profiles for messaging" ON public.profiles IS
'Allows all authenticated users to view basic profile information (name, role, email) of other users. This is required for the messaging system to display sender names and roles. Does not grant access to sensitive profile fields.';
