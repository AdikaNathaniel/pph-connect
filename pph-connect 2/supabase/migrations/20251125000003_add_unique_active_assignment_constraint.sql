-- Migration: Add Unique Active Assignment Constraint
-- Created: 2025-11-25
-- Purpose: Prevent duplicate active assignments (same worker to same project)
--
-- Changes:
--   1. Clean up existing duplicate active assignments (keep oldest, soft-delete rest)
--   2. Add partial unique index on (worker_id, project_id) WHERE removed_at IS NULL
--   3. Fix assigned_by and removed_by to reference profiles (auth.users) instead of workers
--
-- ============================================================================

-- First, clean up existing duplicate active assignments
-- Keep the oldest assignment (first assigned_at), soft-delete the rest
WITH duplicates AS (
  SELECT id,
         worker_id,
         project_id,
         assigned_at,
         ROW_NUMBER() OVER (
           PARTITION BY worker_id, project_id
           ORDER BY assigned_at ASC
         ) as rn
  FROM public.worker_assignments
  WHERE removed_at IS NULL
)
UPDATE public.worker_assignments
SET removed_at = now(),
    removed_by = NULL
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add partial unique index to prevent duplicate active assignments
-- A worker can only have ONE active assignment to a project at a time
-- Past assignments (removed_at IS NOT NULL) are not affected
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_assignments_unique_active
  ON public.worker_assignments(worker_id, project_id)
  WHERE removed_at IS NULL;

-- Fix foreign key references for assigned_by (should reference profiles/auth.users, not workers)
ALTER TABLE public.worker_assignments
  DROP CONSTRAINT IF EXISTS worker_assignments_assigned_by_fkey;

ALTER TABLE public.worker_assignments
  ADD CONSTRAINT worker_assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix foreign key references for removed_by (should reference profiles/auth.users, not workers)
ALTER TABLE public.worker_assignments
  DROP CONSTRAINT IF EXISTS worker_assignments_removed_by_fkey;

ALTER TABLE public.worker_assignments
  ADD CONSTRAINT worker_assignments_removed_by_fkey
    FOREIGN KEY (removed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
