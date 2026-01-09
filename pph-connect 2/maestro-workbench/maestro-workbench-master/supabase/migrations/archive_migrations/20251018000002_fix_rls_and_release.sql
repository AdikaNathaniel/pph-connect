BEGIN;

-- ============================================================================
-- FIX 1: Update RLS Policy for Tasks Table
-- ============================================================================
-- The current policy prevents workers from releasing their own tasks because
-- when they set assigned_to = NULL, the USING clause fails (NULL != auth.uid())
-- We need separate policies for different operations

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Workers can view and update assigned tasks" ON public.tasks;

-- Create separate policies for different operations

-- Workers can SELECT their own assigned tasks
CREATE POLICY "Workers can view their assigned tasks"
ON public.tasks
FOR SELECT
USING (assigned_to = auth.uid());

-- Workers can UPDATE their own assigned tasks (including releasing them)
-- This allows them to set assigned_to = NULL as long as it's currently their ID
CREATE POLICY "Workers can update their assigned tasks"
ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (
  -- Allow releasing (setting to NULL) or keeping assigned to self
  assigned_to IS NULL OR assigned_to = auth.uid()
);

-- Workers cannot INSERT tasks directly (only through claim function)
-- Workers cannot DELETE tasks

-- ============================================================================
-- FIX 2: Improve release_worker_tasks Function
-- ============================================================================
-- Make it more robust and return detailed information

DROP FUNCTION IF EXISTS public.release_worker_tasks();

CREATE OR REPLACE FUNCTION public.release_worker_tasks()
RETURNS TABLE(
  released_count INTEGER,
  released_task_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_ids UUID[];
  count_released INTEGER;
BEGIN
  -- Get IDs of tasks being released
  SELECT ARRAY_AGG(id)
  INTO released_ids
  FROM public.tasks
  WHERE assigned_to = auth.uid()
    AND status IN ('assigned', 'in_progress');

  -- Release all tasks assigned to the current user
  UPDATE public.tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE assigned_to = auth.uid()
    AND status IN ('assigned', 'in_progress');
  
  GET DIAGNOSTICS count_released = ROW_COUNT;
  
  RETURN QUERY SELECT count_released, COALESCE(released_ids, ARRAY[]::UUID[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_worker_tasks() TO authenticated;

-- ============================================================================
-- FIX 3: Add a specific release function for single tasks
-- ============================================================================
-- This is safer than direct UPDATE and respects all business logic

CREATE OR REPLACE FUNCTION public.release_task_by_id(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_exists BOOLEAN;
BEGIN
  -- Check if task exists and belongs to current user
  SELECT EXISTS(
    SELECT 1
    FROM public.tasks
    WHERE id = p_task_id
      AND assigned_to = auth.uid()
      AND status IN ('assigned', 'in_progress')
  ) INTO task_exists;

  IF NOT task_exists THEN
    RETURN FALSE;
  END IF;

  -- Release the task
  UPDATE public.tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE id = p_task_id
    AND assigned_to = auth.uid()
    AND status IN ('assigned', 'in_progress');

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_task_by_id(UUID) TO authenticated;

-- ============================================================================
-- FIX 4: Ensure claim function properly handles cleanup
-- ============================================================================
-- The claim function should be the ONLY way to create task reservations
-- Verify it has proper permissions

-- Ensure the claim function can bypass RLS
ALTER FUNCTION public.claim_next_available_question(UUID, UUID) SECURITY DEFINER;

COMMIT;

