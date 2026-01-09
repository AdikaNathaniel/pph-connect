-- Migration: Create Training Materials Table
-- Created: 2025-11-06
-- Purpose: Store training resources linked to projects.
--
-- Changes:
--   1. Create public.training_materials table with project foreign key
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.training_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  title text NOT NULL,
  description text DEFAULT NULL,
  type text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_training_materials_project
  ON public.training_materials(project_id);

ALTER TABLE public.training_materials
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training materials"
  ON public.training_materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage training materials"
  ON public.training_materials
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
