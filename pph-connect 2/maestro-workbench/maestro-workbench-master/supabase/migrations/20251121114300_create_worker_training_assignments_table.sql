-- Migration: Create Worker Training Assignments Table
-- Created: 2025-11-21
-- Purpose: Track auto-assigned training modules and completion status per worker.

CREATE TABLE IF NOT EXISTS public.worker_training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  training_module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  auto_assigned boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT worker_training_assignments_worker_module_key UNIQUE (worker_id, training_module_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_training_assignments_worker
  ON public.worker_training_assignments(worker_id);

ALTER TABLE public.worker_training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view their training assignments"
  ON public.worker_training_assignments
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Admins manage training assignments"
  ON public.worker_training_assignments
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
