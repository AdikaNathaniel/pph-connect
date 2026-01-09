-- Migration: Create Auto Removals Table
-- Created: 2025-11-06
-- Purpose: Record automated workforce project removals with audit details and appeal tracking.
--
-- Changes:
--   1. Create public.appeal_status enum (idempotent)
--   2. Create public.auto_removals table with foreign keys and snapshot metadata
--   3. Add indexes and RLS policies to control access
--
-- ============================================================================

-- Create appeal_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appeal_status') THEN
        CREATE TYPE public.appeal_status AS ENUM (
          'pending',
          'approved',
          'denied'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auto_removals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_id uuid NOT NULL REFERENCES public.workforce_projects(id),
  removal_reason text NOT NULL,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  removed_at timestamptz NOT NULL DEFAULT now(),
  can_appeal boolean NOT NULL DEFAULT false,
  appeal_status public.appeal_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_removals_worker
  ON public.auto_removals(worker_id);

CREATE INDEX IF NOT EXISTS idx_auto_removals_project
  ON public.auto_removals(project_id);

CREATE INDEX IF NOT EXISTS idx_auto_removals_status
  ON public.auto_removals(appeal_status);

ALTER TABLE public.auto_removals
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read auto removals"
  ON public.auto_removals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage auto removals"
  ON public.auto_removals
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
