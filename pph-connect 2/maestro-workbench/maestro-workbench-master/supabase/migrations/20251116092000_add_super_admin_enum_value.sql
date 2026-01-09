-- Migration: Add super_admin enum value to user_role
-- Created: 2025-11-16
-- Purpose: Add the super_admin enum value to user_role type.
--          This must be in a separate migration from usage due to PostgreSQL transaction safety.
-- ============================================================================

-- Add super_admin to user_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'super_admin';
  END IF;
END $$;
