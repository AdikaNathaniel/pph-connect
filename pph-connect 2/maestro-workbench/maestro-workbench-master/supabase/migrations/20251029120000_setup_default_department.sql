-- Migration: Setup Default Department
-- Created: 2025-10-29
-- Purpose: Create a default department and assign all users to it automatically
--          This ensures messaging permissions work correctly

-- Step 1: Create default department
DO $$
DECLARE
  default_dept_id uuid;
  first_manager_id uuid;
BEGIN
  -- Get the first manager or admin user
  SELECT id INTO first_manager_id
  FROM profiles
  WHERE role IN ('manager', 'admin', 'root')
  ORDER BY created_at
  LIMIT 1;

  -- Insert default department
  INSERT INTO departments (name, description, manager_id)
  VALUES (
    'Default Department',
    'Default department for all users. Users are automatically assigned here unless specified otherwise.',
    first_manager_id
  )
  ON CONFLICT DO NOTHING;

  -- Get the default department ID
  SELECT id INTO default_dept_id
  FROM departments
  WHERE name = 'Default Department'
  LIMIT 1;

  -- Assign all users without a department to the default department
  UPDATE profiles
  SET department_id = default_dept_id
  WHERE department_id IS NULL;

  RAISE NOTICE 'Default department created with ID: %', default_dept_id;
  RAISE NOTICE 'Manager ID: %', first_manager_id;
  RAISE NOTICE 'All existing users assigned to default department';
END $$;
