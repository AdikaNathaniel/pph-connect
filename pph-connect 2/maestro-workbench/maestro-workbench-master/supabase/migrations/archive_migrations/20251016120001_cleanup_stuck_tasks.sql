-- Cleanup existing stuck tasks and create function for ongoing protection
-- This migration fixes tasks that are stuck in 'assigned' or 'in_progress' status
-- even though answers have been submitted for them.

-- One-time cleanup: Fix all currently stuck tasks
UPDATE public.tasks t
SET status = 'completed',
    completed_at = a.completion_time,
    completion_time_seconds = a.aht_seconds,
    updated_at = NOW()
FROM public.answers a
WHERE t.question_id = a.question_id
  AND t.assigned_to = a.worker_id
  AND t.status IN ('assigned', 'in_progress')
  AND a.completion_time IS NOT NULL;

-- Create function to periodically clean up orphaned task reservations
-- This can be called manually or from a scheduled job
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_task_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Clean tasks that are assigned/in_progress but have completed answers
  UPDATE public.tasks t
  SET status = 'completed',
      completed_at = COALESCE(t.completed_at, a.completion_time),
      completion_time_seconds = COALESCE(t.completion_time_seconds, a.aht_seconds),
      updated_at = NOW()
  FROM public.answers a
  WHERE t.question_id = a.question_id
    AND t.assigned_to = a.worker_id
    AND t.status IN ('assigned', 'in_progress')
    AND a.completion_time IS NOT NULL;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  -- Log the cleanup for monitoring
  IF cleaned_count > 0 THEN
    RAISE NOTICE 'Cleaned up % orphaned task reservation(s)', cleaned_count;
  END IF;
  
  RETURN cleaned_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_task_reservations() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.cleanup_orphaned_task_reservations() IS 
  'Fixes tasks stuck in assigned/in_progress status when answers have already been submitted. Safe to run repeatedly (idempotent).';

