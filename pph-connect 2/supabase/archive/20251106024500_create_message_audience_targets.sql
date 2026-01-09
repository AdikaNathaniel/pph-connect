-- Migration: Create Message Audience Targets
-- Created: 2025-11-06
-- Purpose: Support department and team level targeting for messaging threads.
--
-- Changes:
--   1. Create message_audience_targets table with links to threads, departments, and teams
--   2. Add indexes for lookup performance
--   3. Enable RLS with authenticated read and admin-only write policies
--
-- ============================================================================#

CREATE TABLE IF NOT EXISTS public.message_audience_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id),
  team_id uuid REFERENCES public.teams(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CHECK (department_id IS NOT NULL OR team_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_message_audience_targets_thread
  ON public.message_audience_targets(thread_id);

CREATE INDEX IF NOT EXISTS idx_message_audience_targets_department
  ON public.message_audience_targets(department_id)
  WHERE department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_audience_targets_team
  ON public.message_audience_targets(team_id)
  WHERE team_id IS NOT NULL;

ALTER TABLE public.message_audience_targets
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read message audience targets"
  ON public.message_audience_targets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage message audience targets"
  ON public.message_audience_targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  );
