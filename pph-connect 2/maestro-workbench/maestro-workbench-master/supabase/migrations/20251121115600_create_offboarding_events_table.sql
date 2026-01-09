-- Migration: Create Offboarding Events Table
-- Created: 2025-11-21
-- Purpose: Track steps executed during worker offboarding workflow.

CREATE TABLE IF NOT EXISTS public.offboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offboarding_events_worker
  ON public.offboarding_events(worker_id);

ALTER TABLE public.offboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view their offboarding events"
  ON public.offboarding_events
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Admins manage offboarding events"
  ON public.offboarding_events
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
