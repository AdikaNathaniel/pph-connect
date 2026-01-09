-- Fix critical bug: Tasks not completing after answer submission
-- This migration adds a database trigger to automatically mark tasks as completed
-- when an answer is inserted, bypassing RLS and ensuring atomic completion.

-- Create function to complete task when answer is submitted
CREATE OR REPLACE FUNCTION public.complete_task_on_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_record RECORD;
BEGIN
  -- Find the most recent task for this question assigned to this worker
  -- We look for tasks in 'assigned' or 'in_progress' status only
  SELECT t.* INTO task_record
  FROM tasks t
  WHERE t.question_id = NEW.question_id
    AND t.assigned_to = NEW.worker_id
    AND t.status IN ('assigned', 'in_progress')
  ORDER BY t.assigned_at DESC
  LIMIT 1;

  -- If task found, mark it completed
  IF FOUND THEN
    UPDATE tasks
    SET status = 'completed',
        completed_at = NEW.completion_time,
        completion_time_seconds = NEW.aht_seconds,
        updated_at = NOW()
    WHERE id = task_record.id;
    
    -- Log the completion for debugging
    RAISE NOTICE 'Task % completed by trigger for answer %', task_record.id, NEW.id;
  ELSE
    -- This shouldn't happen in normal operation, but log it for monitoring
    RAISE WARNING 'No matching task found for answer % (question: %, worker: %)', 
      NEW.id, NEW.question_id, NEW.worker_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on answers table to auto-complete tasks
-- This runs AFTER the answer is successfully inserted
DROP TRIGGER IF EXISTS trigger_complete_task_on_answer ON public.answers;
CREATE TRIGGER trigger_complete_task_on_answer
  AFTER INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_task_on_answer();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.complete_task_on_answer() IS 
  'Automatically marks tasks as completed when answers are submitted. Runs with SECURITY DEFINER to bypass RLS.';

