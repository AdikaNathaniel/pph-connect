-- Migration: Create Worker Training Access Table
-- Created: 2025-11-06
-- Purpose: Track worker access to training materials.
--
-- Changes:
--   1. Create public.worker_training_access table with foreign keys and timestamps
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.worker_training_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  training_material_id uuid NOT NULL REFERENCES public.training_materials(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_worker_training_access_worker
  ON public.worker_training_access(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_training_access_material
  ON public.worker_training_access(training_material_id);

CREATE INDEX IF NOT EXISTS idx_worker_training_access_active
  ON public.worker_training_access(worker_id)
  WHERE completed_at IS NULL;

ALTER TABLE public.worker_training_access
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker training access"
  ON public.worker_training_access
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker training access"
  ON public.worker_training_access
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
