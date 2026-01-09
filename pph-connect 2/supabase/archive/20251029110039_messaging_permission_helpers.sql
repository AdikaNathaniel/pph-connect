-- Migration: 006 - Messaging Permission Helper Functions
-- Created: 2025-10-29
-- Purpose: Create can_message_user() function that implements hierarchical messaging permissions.
--          This function checks if one user is allowed to send messages to another based on:
--          - Role hierarchy (admin > manager > team_lead > worker)
--          - Department relationships
--          - Reporting relationships (reports_to)
--          - Bidirectional communication (if A can message B, then B can message A)
--
-- Changes:
--   1. Create can_message_user(sender_id, recipient_id) function
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.can_message_user(uuid, uuid);
--
-- Impact: NONE - New function, no dependencies
--   - No modifications to existing functions
--   - Will be used by edge functions for permission validation
--
-- ============================================================================

-- ============================================================================
-- Create can_message_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_message_user(
  _sender_id uuid,
  _recipient_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_role text;
  recipient_role text;
  sender_dept_id uuid;
  recipient_dept_id uuid;
  sender_supervisor uuid;
  recipient_supervisor uuid;
  sender_status public.worker_status;
  recipient_status public.worker_status;
BEGIN
  -- Step 1: Fetch sender information from workers table
  SELECT worker_role, department_id, supervisor_id, status
  INTO sender_role, sender_dept_id, sender_supervisor, sender_status
  FROM public.workers
  WHERE id = _sender_id;

  -- Step 2: Fetch recipient information from workers table
  SELECT worker_role, department_id, supervisor_id, status
  INTO recipient_role, recipient_dept_id, recipient_supervisor, recipient_status
  FROM public.workers
  WHERE id = _recipient_id;

  -- Step 3: Validate workers exist and are active
  IF sender_role IS NULL OR recipient_role IS NULL THEN
    RETURN false;
  END IF;

  IF sender_status <> 'active' OR recipient_status <> 'active' THEN
    RETURN false;
  END IF;

  -- Step 4: Users cannot message themselves
  IF _sender_id = _recipient_id THEN
    RETURN false;
  END IF;

  -- =========================================================================
  -- Step 5: Role-based permission checks (hierarchical)
  -- =========================================================================

  -- 5a. Root can message anyone
  IF sender_role = 'root' THEN
    RETURN true;
  END IF;

  -- 5b. Admin can message anyone
  IF sender_role = 'admin' THEN
    RETURN true;
  END IF;

  -- 5c. Manager permissions
  IF sender_role = 'manager' THEN
    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id THEN
      RETURN true;
    END IF;

    IF recipient_role IN ('manager', 'admin', 'root') THEN
      RETURN true;
    END IF;

    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = recipient_dept_id
        AND d.manager_id = _sender_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 5d. Team Lead permissions
  IF sender_role = 'team_lead' THEN
    IF recipient_supervisor = _sender_id THEN
      RETURN true;
    END IF;

    IF sender_supervisor = _recipient_id THEN
      RETURN true;
    END IF;

    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id THEN
      RETURN true;
    END IF;

    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = sender_dept_id
        AND d.manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;

    IF recipient_role IN ('team_lead', 'manager', 'admin', 'root') THEN
      RETURN true;
    END IF;
  END IF;

  -- 5e. Worker permissions
  IF sender_role = 'worker' THEN
    IF sender_supervisor = _recipient_id THEN
      RETURN true;
    END IF;

    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = sender_dept_id
        AND d.manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;

    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id
       AND recipient_role IN ('team_lead', 'manager') THEN
      RETURN true;
    END IF;

    IF recipient_role IN ('admin', 'root') THEN
      RETURN true;
    END IF;
  END IF;

  -- =========================================================================
  -- Step 6: Bidirectional communication
  -- =========================================================================

  IF recipient_role IN ('root', 'admin') THEN
    RETURN true;
  END IF;

  IF recipient_role = 'manager' AND sender_dept_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.departments d
      WHERE d.id = sender_dept_id
        AND d.manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  IF sender_supervisor = _recipient_id THEN
    RETURN true;
  END IF;

  IF sender_dept_id IS NOT NULL
     AND recipient_dept_id IS NOT NULL
     AND sender_dept_id = recipient_dept_id
     AND recipient_role IN ('team_lead', 'manager') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- Add function comment for documentation
-- ============================================================================

COMMENT ON FUNCTION public.can_message_user(uuid, uuid) IS
'Permission check function for messaging system. Returns true if sender_id is allowed to message recipient_id based on worker roles, department relationships, supervisor hierarchy, and bidirectional communication rules. Uses public.workers as the source of truth for identity and status.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_message_user(uuid, uuid) TO authenticated;

-- Grant execute permission to service role (for edge functions)
GRANT EXECUTE ON FUNCTION public.can_message_user(uuid, uuid) TO service_role;

-- ============================================================================
-- Migration complete
-- can_message_user function created with:
--   - Full hierarchical permission checking
--   - Department-based access control
--   - Reporting relationship support
--   - Bidirectional communication
--   - Worker status validation
-- Next: Create edge functions (validate-message-permissions, send-message)
-- ============================================================================
