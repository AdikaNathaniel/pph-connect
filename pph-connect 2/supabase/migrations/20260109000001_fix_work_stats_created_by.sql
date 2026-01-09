-- ============================================================================
-- Fix work_stats created_by NULL values
-- ============================================================================
-- Purpose: Update existing work_stats records to have created_by set to the worker_id
-- (The worker who performed the work is the creator of the stats record)
-- ============================================================================

-- Update all existing work_stats records that have NULL created_by
-- Set created_by to the worker_id (self-referencing - the worker created their own stats)
UPDATE public.work_stats
SET created_by = worker_id
WHERE created_by IS NULL;
