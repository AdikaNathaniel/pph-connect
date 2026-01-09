-- Migration: Create Worker Onboarding Progress Table
-- Created: 2025-11-21
-- Purpose: Track per-worker completion state for onboarding workflow steps.

CREATE TABLE IF NOT EXISTS public.worker_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT worker_onboarding_progress_worker_step_key UNIQUE (worker_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_onboarding_progress_worker
  ON public.worker_onboarding_progress(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_onboarding_progress_step
  ON public.worker_onboarding_progress(step_id);

ALTER TABLE public.worker_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view onboarding progress"
  ON public.worker_onboarding_progress
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers update their onboarding progress"
  ON public.worker_onboarding_progress
  FOR ALL
  TO authenticated
  USING (
    worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  )
  WITH CHECK (
    worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

CREATE POLICY "Managers administer onboarding progress"
  ON public.worker_onboarding_progress
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
