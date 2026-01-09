-- Check if departments exist
SELECT
  id,
  department_name,
  department_code
FROM public.departments
ORDER BY department_name;

-- Check if admin profile exists
SELECT
  id,
  email,
  full_name,
  role,
  department_id
FROM public.profiles
WHERE id = '76cf385a-e840-4130-be9c-f508a5df9ea2';
