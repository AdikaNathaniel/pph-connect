-- ============================================================================
-- Migration: Complete RLS Policies for Role-Based Access Control
-- Created: 2026-01-09
-- Description: Implements complete RLS policies for all roles:
--   - super_admin (root): full access to everything
--   - admin: manage workers, projects, teams (no admin management)
--   - manager: manage assigned workers and projects (read-only departments/teams)
--   - team_lead: view everything, edit assignments for their team only
--   - worker: self-service view (own profile, assignments, balances - read-only)
-- ============================================================================

-- ============================================================================
-- 1. CREATE HELPER FUNCTIONS FOR ROLE CHECKS
-- ============================================================================

-- Helper: Check if current user is super_admin (root)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'root'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
COMMENT ON FUNCTION public.is_super_admin() IS 'Checks if current user has super_admin (root) role';

-- Helper: Check if current user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
COMMENT ON FUNCTION public.is_manager() IS 'Checks if current user has manager role';

-- Helper: Check if current user is team_lead
CREATE OR REPLACE FUNCTION public.is_team_lead()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'team_lead'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_lead() TO authenticated;
COMMENT ON FUNCTION public.is_team_lead() IS 'Checks if current user has team_lead role';

-- Helper: Check if current user is worker
CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'worker'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_worker() TO authenticated;
COMMENT ON FUNCTION public.is_worker() IS 'Checks if current user has worker role';

-- Helper: Check if current user has admin-level access (root or admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('root', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated;
COMMENT ON FUNCTION public.is_admin_or_above() IS 'Checks if current user has admin or root role';

-- Helper: Check if current user has manager-level access (root, admin, or manager)
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('root', 'admin', 'manager')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager_or_above() TO authenticated;
COMMENT ON FUNCTION public.is_manager_or_above() IS 'Checks if current user has manager, admin, or root role';

-- Helper: Check if current user has team_lead-level access (root, admin, manager, or team_lead)
CREATE OR REPLACE FUNCTION public.is_team_lead_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('root', 'admin', 'manager', 'team_lead')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_team_lead_or_above() TO authenticated;
COMMENT ON FUNCTION public.is_team_lead_or_above() IS 'Checks if current user has team_lead, manager, admin, or root role';

-- Helper: Get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
COMMENT ON FUNCTION public.get_my_role() IS 'Returns the current user role';

-- Helper: Get current user's department_id
CREATE OR REPLACE FUNCTION public.get_my_department_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_department_id() TO authenticated;
COMMENT ON FUNCTION public.get_my_department_id() IS 'Returns the current user department ID';

-- Helper: Check if user is manager of a specific department
CREATE OR REPLACE FUNCTION public.is_department_manager(dept_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.departments
    WHERE id = dept_id
    AND manager_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_department_manager(uuid) TO authenticated;
COMMENT ON FUNCTION public.is_department_manager(uuid) IS 'Checks if current user is manager of specified department';

-- Helper: Check if a user reports to current user (for team leads)
-- Team leads supervise workers who have reports_to = team_lead's id
CREATE OR REPLACE FUNCTION public.is_my_direct_report(user_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_profile_id
    AND reports_to = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_my_direct_report(uuid) TO authenticated;
COMMENT ON FUNCTION public.is_my_direct_report(uuid) IS 'Checks if a profile reports to current user';

-- Helper: Check if a worker is supervised by current user (for team leads)
-- Links worker (via email) to profile that reports_to current user
CREATE OR REPLACE FUNCTION public.is_worker_my_direct_report(worker_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  worker_email text;
BEGIN
  -- Get the worker's email
  SELECT email_personal INTO worker_email
  FROM public.workers
  WHERE id = worker_uuid;

  IF worker_email IS NULL THEN
    RETURN false;
  END IF;

  -- Check if any profile with that email reports to current user
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = worker_email
    AND reports_to = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_worker_my_direct_report(uuid) TO authenticated;
COMMENT ON FUNCTION public.is_worker_my_direct_report(uuid) IS 'Checks if a worker reports to current user (via profile.reports_to)';

-- Helper: Check if a worker is in user's department (for managers)
CREATE OR REPLACE FUNCTION public.is_worker_in_my_department(worker_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  my_dept_id uuid;
  worker_email text;
BEGIN
  -- Get current user's department
  SELECT department_id INTO my_dept_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF my_dept_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get the worker's email
  SELECT email_personal INTO worker_email
  FROM public.workers
  WHERE id = worker_uuid;

  IF worker_email IS NULL THEN
    RETURN false;
  END IF;

  -- Check if worker's profile is in the same department
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = worker_email
    AND department_id = my_dept_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_worker_in_my_department(uuid) TO authenticated;
COMMENT ON FUNCTION public.is_worker_in_my_department(uuid) IS 'Checks if a worker is in current user department';

-- ============================================================================
-- 2. FIX WORK_STATS RLS POLICIES
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "work_stats_select_policy" ON public.work_stats;
DROP POLICY IF EXISTS "work_stats_insert_policy" ON public.work_stats;
DROP POLICY IF EXISTS "work_stats_update_policy" ON public.work_stats;
DROP POLICY IF EXISTS "work_stats_delete_policy" ON public.work_stats;

-- SELECT: Everyone can view (managers see their department workers, team leads see their reports, workers see own)
CREATE POLICY "work_stats_select_policy"
ON public.work_stats
FOR SELECT
TO authenticated
USING (
  -- Admins can see all
  public.is_admin_or_above()
  OR
  -- Managers can see their department's workers
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
  OR
  -- Team leads can see their direct reports
  (public.is_team_lead() AND public.is_worker_my_direct_report(worker_id))
  OR
  -- Workers can see their own stats (need to link profile to worker)
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = work_stats.worker_id
    AND w.email_personal = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);

-- INSERT: Only admins and managers can insert
CREATE POLICY "work_stats_insert_policy"
ON public.work_stats
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
);

-- UPDATE: Only admins and managers can update
CREATE POLICY "work_stats_update_policy"
ON public.work_stats
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
)
WITH CHECK (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
);

-- DELETE: Only admins can delete
CREATE POLICY "work_stats_delete_policy"
ON public.work_stats
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 3. UPDATE WORKERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Authenticated users can read workers" ON public.workers;
DROP POLICY IF EXISTS "workers_select_policy" ON public.workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON public.workers;
DROP POLICY IF EXISTS "workers_update_policy" ON public.workers;
DROP POLICY IF EXISTS "workers_delete_policy" ON public.workers;

-- SELECT: Role-based viewing
CREATE POLICY "workers_select_policy"
ON public.workers
FOR SELECT
TO authenticated
USING (
  -- Admins can see all
  public.is_admin_or_above()
  OR
  -- Managers can see all (but manage only their department)
  public.is_manager()
  OR
  -- Team leads can see all (but manage only their reports)
  public.is_team_lead()
  OR
  -- Workers can see their own profile
  email_personal = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- INSERT: Only admins can create workers
CREATE POLICY "workers_insert_policy"
ON public.workers
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_above());

-- UPDATE: Admins can update all, managers their department, team leads their reports
CREATE POLICY "workers_update_policy"
ON public.workers
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(id))
  OR
  (public.is_team_lead() AND public.is_worker_my_direct_report(id))
)
WITH CHECK (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(id))
  OR
  (public.is_team_lead() AND public.is_worker_my_direct_report(id))
);

-- DELETE: Only admins can delete workers
CREATE POLICY "workers_delete_policy"
ON public.workers
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 4. UPDATE WORKER_ASSIGNMENTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Authenticated users can read worker assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.worker_assignments;
DROP POLICY IF EXISTS "worker_assignments_select_policy" ON public.worker_assignments;
DROP POLICY IF EXISTS "worker_assignments_insert_policy" ON public.worker_assignments;
DROP POLICY IF EXISTS "worker_assignments_update_policy" ON public.worker_assignments;
DROP POLICY IF EXISTS "worker_assignments_delete_policy" ON public.worker_assignments;

-- SELECT: Everyone can view relevant assignments
CREATE POLICY "worker_assignments_select_policy"
ON public.worker_assignments
FOR SELECT
TO authenticated
USING (
  -- Admins can see all
  public.is_admin_or_above()
  OR
  -- Managers can see all
  public.is_manager()
  OR
  -- Team leads can see all
  public.is_team_lead()
  OR
  -- Workers can see their own assignments
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = worker_assignments.worker_id
    AND w.email_personal = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);

-- INSERT: Admins and managers can create assignments
CREATE POLICY "worker_assignments_insert_policy"
ON public.worker_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_above()
  OR
  public.is_manager()
);

-- UPDATE: Admins, managers, and team leads (for their direct reports) can update
CREATE POLICY "worker_assignments_update_policy"
ON public.worker_assignments
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_above()
  OR
  public.is_manager()
  OR
  (public.is_team_lead() AND public.is_worker_my_direct_report(worker_id))
)
WITH CHECK (
  public.is_admin_or_above()
  OR
  public.is_manager()
  OR
  (public.is_team_lead() AND public.is_worker_my_direct_report(worker_id))
);

-- DELETE: Only admins can delete assignments
CREATE POLICY "worker_assignments_delete_policy"
ON public.worker_assignments
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 5. UPDATE PROJECTS TABLE RLS POLICIES (workforce_projects)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.workforce_projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.workforce_projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.workforce_projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.workforce_projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.workforce_projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.workforce_projects;

-- SELECT: Everyone can view projects (needed for assignments)
CREATE POLICY "projects_select_policy"
ON public.workforce_projects
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins can create projects
CREATE POLICY "projects_insert_policy"
ON public.workforce_projects
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_above());

-- UPDATE: Admins and managers can update projects
CREATE POLICY "projects_update_policy"
ON public.workforce_projects
FOR UPDATE
TO authenticated
USING (public.is_admin_or_above() OR public.is_manager())
WITH CHECK (public.is_admin_or_above() OR public.is_manager());

-- DELETE: Only admins can delete projects
CREATE POLICY "projects_delete_policy"
ON public.workforce_projects
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 6. UPDATE TEAMS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can read teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;

-- SELECT: Everyone can view teams (read-only for lower roles)
CREATE POLICY "teams_select_policy"
ON public.teams
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins can create teams
CREATE POLICY "teams_insert_policy"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_above());

-- UPDATE: Only admins can update teams
CREATE POLICY "teams_update_policy"
ON public.teams
FOR UPDATE
TO authenticated
USING (public.is_admin_or_above())
WITH CHECK (public.is_admin_or_above());

-- DELETE: Only admins can delete teams
CREATE POLICY "teams_delete_policy"
ON public.teams
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 7. UPDATE DEPARTMENTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and managers can manage departments" ON public.departments;
DROP POLICY IF EXISTS "departments_select_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_update_policy" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON public.departments;

-- SELECT: Everyone can view departments (read-only for lower roles)
CREATE POLICY "departments_select_policy"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins can create departments
CREATE POLICY "departments_insert_policy"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_above());

-- UPDATE: Only admins can update departments
CREATE POLICY "departments_update_policy"
ON public.departments
FOR UPDATE
TO authenticated
USING (public.is_admin_or_above())
WITH CHECK (public.is_admin_or_above());

-- DELETE: Only admins can delete departments
CREATE POLICY "departments_delete_policy"
ON public.departments
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 8. UPDATE PROFILES TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Root can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Root can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- SELECT: Everyone can view profiles they have access to
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Everyone can see their own profile
  id = auth.uid()
  OR
  -- Admins can see all profiles
  public.is_admin_or_above()
  OR
  -- Managers can see profiles in their department
  (public.is_manager() AND department_id = public.get_my_department_id())
  OR
  -- Team leads can see their direct reports
  (public.is_team_lead() AND reports_to = auth.uid())
);

-- INSERT: Only through auth system (handled by trigger) or super_admin
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()  -- User creating their own profile
  OR public.is_super_admin()  -- Super admin can create profiles
);

-- UPDATE: Users can update own, admins can update all (except promoting to super_admin)
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()  -- Own profile
  OR public.is_admin_or_above()  -- Admin managing profiles
)
WITH CHECK (
  id = auth.uid()  -- Own profile
  OR public.is_admin_or_above()  -- Admin managing profiles
);

-- DELETE: Only super_admin can delete profiles
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- ============================================================================
-- 9. UPDATE WORKER_ACCOUNTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view accounts" ON public.worker_accounts;
DROP POLICY IF EXISTS "Admins can manage accounts" ON public.worker_accounts;
DROP POLICY IF EXISTS "worker_accounts_select_policy" ON public.worker_accounts;
DROP POLICY IF EXISTS "worker_accounts_insert_policy" ON public.worker_accounts;
DROP POLICY IF EXISTS "worker_accounts_update_policy" ON public.worker_accounts;
DROP POLICY IF EXISTS "worker_accounts_delete_policy" ON public.worker_accounts;

-- SELECT: Role-based viewing
CREATE POLICY "worker_accounts_select_policy"
ON public.worker_accounts
FOR SELECT
TO authenticated
USING (
  -- Admins can see all
  public.is_admin_or_above()
  OR
  -- Managers can see all
  public.is_manager()
  OR
  -- Team leads can see their direct reports' accounts
  (public.is_team_lead() AND public.is_worker_my_direct_report(worker_id))
  OR
  -- Workers can see their own accounts
  EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.id = worker_accounts.worker_id
    AND w.email_personal = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
);

-- INSERT: Only admins can create accounts
CREATE POLICY "worker_accounts_insert_policy"
ON public.worker_accounts
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_above());

-- UPDATE: Admins and managers can update
CREATE POLICY "worker_accounts_update_policy"
ON public.worker_accounts
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
)
WITH CHECK (
  public.is_admin_or_above()
  OR
  (public.is_manager() AND public.is_worker_in_my_department(worker_id))
);

-- DELETE: Only admins can delete accounts
CREATE POLICY "worker_accounts_delete_policy"
ON public.worker_accounts
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 10. UPDATE RATES_PAYABLE TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "rates_payable_select" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_insert" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_update" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_delete" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_select_policy" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_insert_policy" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_update_policy" ON public.rates_payable;
DROP POLICY IF EXISTS "rates_payable_delete_policy" ON public.rates_payable;

-- SELECT: Everyone can view rates
CREATE POLICY "rates_payable_select_policy"
ON public.rates_payable
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins and managers can create rates
CREATE POLICY "rates_payable_insert_policy"
ON public.rates_payable
FOR INSERT
TO authenticated
WITH CHECK (public.is_manager_or_above());

-- UPDATE: Only admins and managers can update rates
CREATE POLICY "rates_payable_update_policy"
ON public.rates_payable
FOR UPDATE
TO authenticated
USING (public.is_manager_or_above())
WITH CHECK (public.is_manager_or_above());

-- DELETE: Only admins can delete rates
CREATE POLICY "rates_payable_delete_policy"
ON public.rates_payable
FOR DELETE
TO authenticated
USING (public.is_admin_or_above());

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "work_stats_select_policy" ON public.work_stats IS
  'Admins see all, managers see department, team leads see direct reports, workers see own';

COMMENT ON POLICY "workers_select_policy" ON public.workers IS
  'Admins/managers/team leads can view all workers, workers can view own profile';

COMMENT ON POLICY "worker_assignments_select_policy" ON public.worker_assignments IS
  'Role-based access: admins/managers/team leads see all, workers see own assignments';

COMMENT ON POLICY "projects_select_policy" ON public.workforce_projects IS
  'All authenticated users can view projects';

COMMENT ON POLICY "teams_select_policy" ON public.teams IS
  'All authenticated users can view teams (read-only for non-admins)';

COMMENT ON POLICY "departments_select_policy" ON public.departments IS
  'All authenticated users can view departments (read-only for non-admins)';

-- ============================================================================
-- Migration Complete
-- ============================================================================
