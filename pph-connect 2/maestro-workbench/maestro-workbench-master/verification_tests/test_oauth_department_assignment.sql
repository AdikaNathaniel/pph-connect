-- Test: Verify OAuth Department Assignment
-- Purpose: Verify that the handle_new_user() function properly assigns
--          new users to the default department

-- ============================================================================
-- Test 1: Check if default department exists
-- ============================================================================
SELECT
  'Test 1: Default Department Exists' as test_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM departments WHERE department_name = 'Default Department')
    THEN 'PASS - Default department exists'
    ELSE 'FAIL - Default department missing'
  END as result;

-- ============================================================================
-- Test 2: Check handle_new_user function includes department_id
-- ============================================================================
SELECT
  'Test 2: Function Updated' as test_name,
  CASE
    WHEN prosrc LIKE '%department_id%'
    THEN 'PASS - Function includes department_id assignment'
    ELSE 'FAIL - Function missing department_id assignment'
  END as result
FROM pg_proc
WHERE proname = 'handle_new_user';

-- ============================================================================
-- Test 3: Check if all profiles have departments assigned
-- ============================================================================
SELECT
  'Test 3: All Users Have Departments' as test_name,
  CASE
    WHEN COUNT(*) = 0
    THEN 'PASS - All users have departments'
    ELSE 'FAIL - ' || COUNT(*) || ' users missing departments'
  END as result
FROM profiles
WHERE department_id IS NULL;

-- ============================================================================
-- Test 4: Show department assignment counts
-- ============================================================================
SELECT
  'Test 4: Department Counts' as test_name,
  d.department_name as department_name,
  COUNT(p.id) as user_count
FROM departments d
LEFT JOIN profiles p ON p.department_id = d.id
GROUP BY d.id, d.department_name
ORDER BY user_count DESC;
