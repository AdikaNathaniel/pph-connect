-- ============================================================================
-- PPH Connect Database Schema Verification
-- Day 1, Task 1.2: Verify Complete Database Schema
-- Run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Verify All Phase 1 Tables Exist
-- ============================================================================

SELECT
  'departments' as table_name,
  EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') as exists
UNION ALL
SELECT 'teams', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams')
UNION ALL
SELECT 'workers', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workers')
UNION ALL
SELECT 'worker_accounts', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'worker_accounts')
UNION ALL
SELECT 'workforce_projects', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workforce_projects')
UNION ALL
SELECT 'project_teams', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_teams')
UNION ALL
SELECT 'worker_assignments', EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'worker_assignments')
ORDER BY table_name;

-- Expected: All rows should show 'exists' = true

-- ============================================================================
-- PART 2: Verify Indexes on All Tables
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('departments', 'teams', 'workers', 'worker_accounts', 'workforce_projects', 'project_teams', 'worker_assignments')
ORDER BY tablename, indexname;

-- Expected: Should see indexes like:
-- departments: idx_departments_code, idx_departments_active
-- teams: idx_teams_department, idx_teams_locale, idx_teams_active
-- workers: idx_workers_hr_id, idx_workers_status, idx_workers_supervisor, idx_workers_email
-- etc.

-- ============================================================================
-- PART 3: Verify RLS (Row Level Security) Policies
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('departments', 'teams', 'workers', 'worker_accounts', 'workforce_projects', 'project_teams', 'worker_assignments')
ORDER BY tablename, policyname;

-- Expected: Each table should have 2 policies:
-- 1. "Authenticated users can read [table]" - FOR SELECT
-- 2. "Admins can manage [table]" - FOR ALL

-- ============================================================================
-- PART 4: Verify Column Structure for Core Tables
-- ============================================================================

-- Check departments table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'departments'
ORDER BY ordinal_position;

-- Check workers table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workers'
ORDER BY ordinal_position;

-- Check workforce_projects table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workforce_projects'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 5: Verify Foreign Key Relationships
-- ============================================================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('teams', 'workers', 'worker_accounts', 'workforce_projects', 'project_teams', 'worker_assignments')
ORDER BY tc.table_name, kcu.column_name;

-- Expected foreign keys:
-- teams.department_id -> departments.id
-- workers.supervisor_id -> workers.id
-- worker_accounts.worker_id -> workers.id
-- workforce_projects.department_id -> departments.id
-- project_teams.project_id -> workforce_projects.id
-- project_teams.team_id -> teams.id
-- worker_assignments.worker_id -> workers.id
-- worker_assignments.project_id -> workforce_projects.id

-- ============================================================================
-- PART 6: Verify Custom Types (ENUMs)
-- ============================================================================

SELECT
  n.nspname as schema,
  t.typname as type_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('engagement_model', 'worker_status', 'platform_type', 'worker_account_status', 'project_status', 'project_expert_tier')
ORDER BY type_name, sort_order;

-- Expected ENUMs:
-- engagement_model: core, upwork, external, internal
-- worker_status: pending, active, inactive, terminated
-- platform_type: DataCompute, Maestro, Other
-- worker_account_status: active, inactive, replaced
-- project_status: active, paused, completed, cancelled
-- project_expert_tier: tier0, tier1, tier2

-- ============================================================================
-- PART 7: Check Migration History
-- ============================================================================

SELECT
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- Expected: Should see baseline migration (20251112000000) and workforce migrations (2025110600xxxx)

-- ============================================================================
-- SUCCESS CRITERIA CHECKLIST
-- ============================================================================

/*
✅ All 7 Phase 1 tables exist (departments, teams, workers, worker_accounts, workforce_projects, project_teams, worker_assignments)
✅ All tables have proper indexes (email, status, foreign keys)
✅ All tables have RLS enabled with 2 policies each (read for authenticated, manage for admins)
✅ All foreign key relationships are correct
✅ All 6 custom ENUM types exist with correct values
✅ Migration history shows applied migrations

If all checks pass, you're ready for:
- Task 1.2 Step 2: Generate TypeScript types
- Task 1.3: Bootstrap PPH Connect Application
*/
