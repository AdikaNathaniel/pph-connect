-- Migration: Add department reference to workers
-- Created: 2025-11-20
-- Purpose: Store each worker's primary department for messaging and management workflows.
--
-- Changes:
--   1. Add nullable department_id column referencing public.departments
--   2. Backfill existing workers with NULL (no data mutation required in empty environments)
--   3. Create index for department lookups

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workers_department
  ON public.workers(department_id)
  WHERE department_id IS NOT NULL;

COMMENT ON COLUMN public.workers.department_id IS
'Primary department association for the worker. Used for messaging permissions, departmental reporting, and management dashboards.';
