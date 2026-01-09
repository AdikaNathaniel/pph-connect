-- Migration: Fix OAuth Users Without Departments
-- Created: 2025-10-30
-- Purpose: Assign all users without departments to the default department
--          This fixes messaging permission issues for OAuth users
--
-- Changes:
--   1. Assign all users without department_id to the "Default Department"
--
-- Rollback: N/A - This is a data fix, not a structural change
--
-- ============================================================================

-- ============================================================================
-- Assign users without departments to default department
-- ============================================================================

DO $$
DECLARE
  default_dept_id uuid;
  users_updated integer;
BEGIN
  -- Get the default department ID
  SELECT id INTO default_dept_id
  FROM departments
  WHERE name = 'Default Department'
  LIMIT 1;

  -- Check if default department exists
  IF default_dept_id IS NULL THEN
    RAISE EXCEPTION 'Default Department not found. Please run migration 20251029120000_setup_default_department.sql first';
  END IF;

  -- Assign all users without a department to the default department
  UPDATE profiles
  SET department_id = default_dept_id
  WHERE department_id IS NULL;

  GET DIAGNOSTICS users_updated = ROW_COUNT;

  RAISE NOTICE 'Assigned % users to default department (ID: %)', users_updated, default_dept_id;
END $$;

-- ============================================================================
-- Migration complete
-- All users without departments have been assigned to the default department
-- This includes OAuth users who signed up without department assignment
-- ============================================================================
