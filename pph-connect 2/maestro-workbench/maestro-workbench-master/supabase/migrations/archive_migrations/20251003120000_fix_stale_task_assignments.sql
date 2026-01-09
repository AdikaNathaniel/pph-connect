-- Fix reservation system: 1-hour reservations with browser close detection
CREATE OR REPLACE FUNCTION public.claim_next_available_question(p_project_id UUID, p_worker_id UUID)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  question_id TEXT,
  row_index INTEGER,
  data JSONB,
  completed_replications INTEGER,
  required_replications INTEGER,
  is_answered BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  selected_question RECORD;
  reservation_threshold TIMESTAMPTZ;
BEGIN
  -- Define reservation threshold (1 hour ago)
  reservation_threshold := NOW() - INTERVAL '1 hour';
  
  -- Clean up expired reservations before claiming
  UPDATE tasks 
  SET status = 'pending', 
      assigned_to = NULL, 
      assigned_at = NULL
  WHERE status IN ('assigned', 'in_progress')
    AND assigned_at < reservation_threshold;
  
  -- Find and claim the next available question atomically
  SELECT q.* INTO selected_question
  FROM questions q
  WHERE q.project_id = p_project_id
    AND q.is_answered = false
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.question_id = q.id 
        AND t.status IN ('assigned', 'in_progress')
        AND t.assigned_at >= reservation_threshold  -- Only consider recent reservations
    )
  ORDER BY q.row_index ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no question found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create a task record to claim this question
  INSERT INTO tasks (
    project_id,
    question_id,
    row_index,
    data,
    status,
    assigned_to,
    assigned_at
  ) VALUES (
    selected_question.project_id,
    selected_question.id,
    selected_question.row_index,
    selected_question.data,
    'assigned',
    p_worker_id,
    NOW()
  );
  
  -- Return the question data
  RETURN QUERY SELECT 
    selected_question.id,
    selected_question.project_id,
    selected_question.question_id,
    selected_question.row_index,
    selected_question.data,
    selected_question.completed_replications,
    selected_question.required_replications,
    selected_question.is_answered,
    selected_question.created_at;
END;
$$;

-- Create a cleanup function that can be called periodically
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Clean up reservations older than 1 hour
  UPDATE tasks 
  SET status = 'pending', 
      assigned_to = NULL, 
      assigned_at = NULL
  WHERE status IN ('assigned', 'in_progress')
    AND assigned_at < (NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  
  RETURN cleaned_count;
END;
$$;

-- Add a comment explaining the cleanup function
COMMENT ON FUNCTION public.cleanup_expired_reservations() IS 
  'Cleans up task reservations older than 1 hour. Returns the number of tasks cleaned up. Can be called manually or scheduled via pg_cron.';

