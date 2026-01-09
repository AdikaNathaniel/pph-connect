-- Migration: Create Worker Assignments Table
-- Created: 2025-11-06
-- Purpose: Track worker to workforce project assignments with soft-delete metadata.
--
-- Changes:
--   1. Create public.worker_assignments table with foreign keys and audit metadata
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.worker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  removed_at timestamptz DEFAULT NULL,
  removed_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker
  ON public.worker_assignments(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_project
  ON public.worker_assignments(project_id);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_active
  ON public.worker_assignments(worker_id)
  WHERE removed_at IS NULL;

ALTER TABLE public.worker_assignments
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker assignments"
  ON public.worker_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker assignments"
  ON public.worker_assignments
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
