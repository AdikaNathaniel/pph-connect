-- Add reservation time limit column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS reservation_time_limit_minutes INTEGER NOT NULL DEFAULT 60;

COMMENT ON COLUMN public.projects.reservation_time_limit_minutes IS 'Task reservation time limit in minutes for active reservations.';

-- Update claim_next_available_question to respect per-project reservation limits
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
  reservation_minutes INTEGER;
BEGIN
  -- Determine reservation limit for the project (default to 60 minutes)
  SELECT COALESCE(NULLIF(reservation_time_limit_minutes, 0), 60)
  INTO reservation_minutes
  FROM public.projects
  WHERE id = p_project_id
  LIMIT 1;

  IF reservation_minutes IS NULL OR reservation_minutes < 0 THEN
    reservation_minutes := 60;
  END IF;

  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Clean up expired reservations for this project before claiming
  UPDATE public.tasks t
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL
  WHERE t.project_id = p_project_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at < reservation_threshold;

  -- Find and claim the next available question atomically
  SELECT q.* INTO selected_question
  FROM public.questions q
  WHERE q.project_id = p_project_id
    AND q.is_answered = false
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.question_id = q.id
        AND t.status IN ('assigned', 'in_progress')
        AND t.assigned_at >= reservation_threshold
    )
  ORDER BY q.row_index ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no question found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Create a task record to claim this question
  INSERT INTO public.tasks (
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

-- Update cleanup function to use per-project reservation limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE public.tasks t
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL
  FROM public.projects p
  WHERE t.project_id = p.id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1));

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  RETURN cleaned_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_reservations() IS 
  'Cleans up task reservations older than each project''s configured limit. Returns the number of tasks cleaned up. Can be called manually or scheduled via pg_cron.';
