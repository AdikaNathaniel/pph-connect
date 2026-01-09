-- Migration: Add admin role to is_root_or_manager function
-- Created: 2025-11-05
-- Purpose: Allow users with 'admin' role to have same permissions as managers
--          This enables admins to:
--          - Access manager routes and dashboard
--          - Manage users, projects, and assignments
--          - Have full RLS access to manager-level resources
--
-- Changes:
--   1. Update is_root_or_manager function to include 'admin' role
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."is_root_or_manager"("_user_id" "uuid")
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND role IN ('root', 'admin', 'manager')
    );
$$;

COMMENT ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") IS 'Check if user has root, admin, or manager role for permission checks';
