-- Migration: Enforce Admin RLS Using worker_has_role
-- Created: 2025-11-06
-- Purpose: Update legacy policies to rely on public.worker_has_role instead of profiles lookups.
--
-- ============================================================================#

CREATE OR REPLACE FUNCTION public.worker_has_role(_worker_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    WHERE w.id = _worker_id
      AND w.worker_role = ANY(_roles)
  );
$$;

COMMENT ON FUNCTION public.worker_has_role IS
'Checks if a worker has any of the specified roles (root/admin/manager/team_lead/etc) using public.workers.worker_role.';

-- Departments
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
  ON public.departments
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Teams
DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Projects
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Accounts
DROP POLICY IF EXISTS "Admins can manage worker accounts" ON public.worker_accounts;
CREATE POLICY "Admins can manage worker accounts"
  ON public.worker_accounts
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Assignments
DROP POLICY IF EXISTS "Admins can manage worker assignments" ON public.worker_assignments;
CREATE POLICY "Admins can manage worker assignments"
  ON public.worker_assignments
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Skills
DROP POLICY IF EXISTS "Admins can manage worker skills" ON public.worker_skills;
CREATE POLICY "Admins can manage worker skills"
  ON public.worker_skills
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Skill Assessments
DROP POLICY IF EXISTS "Admins can manage skill assessments" ON public.skill_assessments;
CREATE POLICY "Admins can manage skill assessments"
  ON public.skill_assessments
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Applications
DROP POLICY IF EXISTS "Admins can manage worker applications" ON public.worker_applications;
CREATE POLICY "Admins can manage worker applications"
  ON public.worker_applications
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Project Listings
DROP POLICY IF EXISTS "Admins can manage project listings" ON public.project_listings;
CREATE POLICY "Admins can manage project listings"
  ON public.project_listings
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Rates Payable
DROP POLICY IF EXISTS "Admins can manage rates payable" ON public.rates_payable;
CREATE POLICY "Admins can manage rates payable"
  ON public.rates_payable
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Performance Reviews
DROP POLICY IF EXISTS "Admins can manage performance reviews" ON public.performance_reviews;
CREATE POLICY "Admins can manage performance reviews"
  ON public.performance_reviews
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Quality Metrics
DROP POLICY IF EXISTS "Admins can manage quality metrics" ON public.quality_metrics;
CREATE POLICY "Admins can manage quality metrics"
  ON public.quality_metrics
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Auto Removals
DROP POLICY IF EXISTS "Admins can manage auto removals" ON public.auto_removals;
CREATE POLICY "Admins can manage auto removals"
  ON public.auto_removals
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Work Stats
DROP POLICY IF EXISTS "Admins can manage work stats" ON public.work_stats;
CREATE POLICY "Admins can manage work stats"
  ON public.work_stats
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Training Gates
DROP POLICY IF EXISTS "Admins can manage training gates" ON public.training_gates;
CREATE POLICY "Admins can manage training gates"
  ON public.training_gates
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Training Access
DROP POLICY IF EXISTS "Admins can manage worker training access" ON public.worker_training_access;
CREATE POLICY "Admins can manage worker training access"
  ON public.worker_training_access
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Training Materials
DROP POLICY IF EXISTS "Admins can manage training materials" ON public.training_materials;
CREATE POLICY "Admins can manage training materials"
  ON public.training_materials
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));

-- Worker Accounts (read policy remains, write uses helper)
DROP POLICY IF EXISTS "Authenticated users can read worker accounts" ON public.worker_accounts;
CREATE POLICY "Authenticated users can read worker accounts"
  ON public.worker_accounts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage worker accounts" ON public.worker_accounts;
CREATE POLICY "Admins can manage worker accounts"
  ON public.worker_accounts
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin']));
