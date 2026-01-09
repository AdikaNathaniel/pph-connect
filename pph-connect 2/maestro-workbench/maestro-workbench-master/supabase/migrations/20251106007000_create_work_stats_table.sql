-- Migration: Create Work Stats Table
-- Created: 2025-11-06
-- Purpose: Store worker production statistics tied to accounts and projects.
--
-- Changes:
--   1. Create public.work_stats table with metrics and audit metadata
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.work_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  worker_account_id uuid NOT NULL REFERENCES public.worker_accounts(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  work_date date NOT NULL,
  units_completed numeric DEFAULT 0,
  hours_worked numeric DEFAULT 0,
  earnings numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

ALTER TABLE public.work_stats
  ADD CONSTRAINT work_stats_worker_account_project_date_key
    UNIQUE (worker_account_id, project_id, work_date);

CREATE INDEX IF NOT EXISTS idx_work_stats_worker
  ON public.work_stats(worker_id);

CREATE INDEX IF NOT EXISTS idx_work_stats_project
  ON public.work_stats(project_id);

CREATE INDEX IF NOT EXISTS idx_work_stats_date
  ON public.work_stats(work_date);

CREATE INDEX IF NOT EXISTS idx_work_stats_account
  ON public.work_stats(worker_account_id);

ALTER TABLE public.work_stats
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read work stats"
  ON public.work_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage work stats"
  ON public.work_stats
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
