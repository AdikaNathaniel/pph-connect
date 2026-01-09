-- Migration: Create Training Gates Table
-- Created: 2025-11-06
-- Purpose: Track worker gate progress on projects.
--
-- Changes:
--   1. Create public.training_gates table with foreign keys and state fields
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  gate_name text NOT NULL,
  status text NOT NULL,
  score numeric DEFAULT 0,
  attempt_count integer NOT NULL DEFAULT 0,
  passed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_gates_worker_project_gate_key
    UNIQUE (worker_id, project_id, gate_name)
);

CREATE INDEX IF NOT EXISTS idx_training_gates_worker
  ON public.training_gates(worker_id);

CREATE INDEX IF NOT EXISTS idx_training_gates_project
  ON public.training_gates(project_id);

ALTER TABLE public.training_gates
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training gates"
  ON public.training_gates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage training gates"
  ON public.training_gates
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
