-- Migration: Allow tasks to enter needs_review status
-- Created: 2025-11-12
-- Purpose: Support reassignment workflow by adding needs_review to tasks_status_check
--
-- ============================================================================

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (
    status = ANY (ARRAY['pending', 'assigned', 'completed', 'needs_review'])
  );
