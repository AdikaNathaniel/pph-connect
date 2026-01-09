-- Migration: Align RLS policies with super_admin hierarchy
-- Created: 2025-11-16
-- Purpose: Ensure policies leverage worker_has_role with the super_admin/admin/... ordering
-- ============================================================================

-- Helper macro to reduce duplication is not available in SQL, so apply ALTER POLICY statements.

ALTER POLICY "Admins can manage departments" ON public.departments
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage teams" ON public.teams
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage projects" ON public.projects
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']));

ALTER POLICY "Admins can manage worker accounts" ON public.worker_accounts
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage worker assignments" ON public.worker_assignments
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']));

ALTER POLICY "Admins can manage worker skills" ON public.worker_skills
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage skill assessments" ON public.skill_assessments
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage worker applications" ON public.worker_applications
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage project listings" ON public.project_listings
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager']));

ALTER POLICY "Admins can manage rates payable" ON public.rates_payable
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage performance reviews" ON public.performance_reviews
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage quality metrics" ON public.quality_metrics
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage auto removals" ON public.auto_removals
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage work stats" ON public.work_stats
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage training gates" ON public.training_gates
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage worker training access" ON public.worker_training_access
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

ALTER POLICY "Admins can manage training materials" ON public.training_materials
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin']));

-- Messaging products leverage manager tier, ensure super_admin is included.
ALTER POLICY "Admins view all threads" ON public.message_threads
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));

ALTER POLICY "Admins view all messages" ON public.messages
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));

ALTER POLICY "Admins view all recipients" ON public.message_recipients
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));

ALTER POLICY "Admins view all groups" ON public.message_groups
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));

ALTER POLICY "Admins can manage message audience targets" ON public.message_audience_targets
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));

ALTER POLICY "Admins can manage broadcast runs" ON public.message_broadcast_runs
  USING (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['super_admin','admin','manager','team_lead']));
