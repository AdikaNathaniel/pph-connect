-- Migration: 001 - Extend User Roles
-- Created: 2025-10-29
-- Purpose: Add 'admin' and 'team_lead' roles to user_role enum and create helper function
--          for messaging permission checks. This is part of the hierarchical messaging feature.
--
-- Changes:
--   1. Extend user_role enum with 'admin' and 'team_lead' values
--   2. Create can_send_messages() helper function for RLS policies
--
-- Rollback:
--   Note: PostgreSQL enum values cannot be removed once added.
--   To rollback, you would need to:
--   1. DROP FUNCTION public.can_send_messages(uuid);
--   2. (Enum values will remain but can be ignored)
--
-- Impact: NONE - Backward compatible
--   - New enum values are additive only
--   - Existing roles (root, manager, worker) unchanged
--   - New function is isolated (no existing code depends on it)
--   - No data modifications
--
-- ============================================================================

-- Step 1: Extend user_role enum with new values
-- IF NOT EXISTS clause prevents errors if values already exist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'team_lead';

-- Step 2: Create helper function for messaging permissions
-- This function will be used by RLS policies to check if a user can send messages
-- SECURITY DEFINER: Executes with privileges of function owner (avoids RLS recursion)
-- SET search_path = public: Security measure to prevent search_path hijacking
CREATE OR REPLACE FUNCTION public.can_send_messages(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can send messages if:
  --   1. They have a valid role (any role in the enum)
  --   2. They are not suspended
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('root', 'admin', 'manager', 'team_lead', 'worker')
    AND suspended = false
  );
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.can_send_messages(uuid) IS
'Helper function to check if a user can send messages. Returns true if user exists, has a valid role, and is not suspended. Used by messaging RLS policies.';

-- Grant execute permission to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION public.can_send_messages(uuid) TO authenticated;

-- Migration complete
-- Next: Run test_001_extend_user_roles.sql to verify changes
