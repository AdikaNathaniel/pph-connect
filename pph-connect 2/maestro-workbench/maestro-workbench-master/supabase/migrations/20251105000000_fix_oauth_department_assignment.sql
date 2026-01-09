-- Migration: Fix OAuth Department Assignment
-- Created: 2025-11-05
-- Purpose: Update handle_new_user() function to automatically assign new OAuth users
--          to the default department when they sign up for the first time.
--
-- Changes:
--   1. Update handle_new_user() to include department_id assignment
--   2. Assign existing users without departments to default department
--
-- Impact: Fixes messaging permission issues for OAuth users
-- ============================================================================

-- Step 1: Update handle_new_user() function to assign default department
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_dept_id uuid;
BEGIN
  -- Get the default department ID
  SELECT id INTO default_dept_id
  FROM public.departments
  WHERE name = 'Default Department'
  LIMIT 1;

  -- Insert new profile with department assignment
  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'worker'),
    default_dept_id  -- Assign to default department
  );

  RETURN NEW;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function: automatically create profile when user signs up. Assigns new users to default department.';

-- Step 2: Fix existing users without departments (safety measure)
DO $$
DECLARE
  default_dept_id uuid;
  users_updated integer;
BEGIN
  -- Get the default department ID
  SELECT id INTO default_dept_id
  FROM public.departments
  WHERE name = 'Default Department'
  LIMIT 1;

  -- If default department exists, assign users without departments
  IF default_dept_id IS NOT NULL THEN
    UPDATE public.profiles
    SET department_id = default_dept_id
    WHERE department_id IS NULL;

    GET DIAGNOSTICS users_updated = ROW_COUNT;

    RAISE NOTICE 'Updated % existing users to default department', users_updated;
  ELSE
    RAISE WARNING 'Default Department not found. Please ensure it is created first.';
  END IF;
END $$;

-- Migration complete
-- New OAuth users will now be automatically assigned to the default department
