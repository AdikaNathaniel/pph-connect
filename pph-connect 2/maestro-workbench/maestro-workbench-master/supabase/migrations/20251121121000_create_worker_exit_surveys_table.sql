-- Migration: Create Worker Exit Surveys Table
-- Created: 2025-11-21
-- Purpose: Capture exit survey responses from workers during offboarding.

CREATE TABLE IF NOT EXISTS public.worker_exit_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  reason text,
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  improvement_suggestions text,
  would_recommend boolean,
  additional_feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_exit_surveys_worker
  ON public.worker_exit_surveys(worker_id);

ALTER TABLE public.worker_exit_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can submit exit survey"
  ON public.worker_exit_surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can view their exit survey"
  ON public.worker_exit_surveys
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Admins can view exit surveys"
  ON public.worker_exit_surveys
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
