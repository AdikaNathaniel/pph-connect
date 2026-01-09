-- Migration: Fix Worker Assignments Foreign Keys
-- Created: 2025-11-25
-- Purpose: Change assigned_by and removed_by to reference profiles instead of workers
--
-- The assigned_by and removed_by columns should reference the user who performed
-- the action (from profiles/auth.users), not a worker record.
--
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE public.worker_assignments
  DROP CONSTRAINT IF EXISTS worker_assignments_assigned_by_fkey;

ALTER TABLE public.worker_assignments
  DROP CONSTRAINT IF EXISTS worker_assignments_removed_by_fkey;

-- Add new foreign key constraints referencing profiles
ALTER TABLE public.worker_assignments
  ADD CONSTRAINT worker_assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.worker_assignments
  ADD CONSTRAINT worker_assignments_removed_by_fkey
    FOREIGN KEY (removed_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
