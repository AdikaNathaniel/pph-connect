-- Create function for workers to release their assigned tasks
CREATE OR REPLACE FUNCTION public.release_worker_tasks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  -- Release all tasks assigned to the current user
  UPDATE public.tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = now()
  WHERE assigned_to = auth.uid()
    AND status IN ('assigned', 'in_progress');
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  
  RETURN released_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.release_worker_tasks() TO authenticated;
