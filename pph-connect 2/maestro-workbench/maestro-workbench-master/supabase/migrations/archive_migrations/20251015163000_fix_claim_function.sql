-- Harden claim_next_available_question to avoid ambiguous column references by
-- fully qualifying selected columns and re-selecting the question row.
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
  reservation_threshold TIMESTAMPTZ;
  reservation_minutes INTEGER;
  question_id UUID;
  question_project_id UUID;
  question_question_id TEXT;
  question_row_index INTEGER;
  question_data JSONB;
  question_completed_replications INTEGER;
  question_required_replications INTEGER;
  question_is_answered BOOLEAN;
  question_created_at TIMESTAMPTZ;
BEGIN
  -- Determine reservation limit for the project (default to 60 minutes)
  SELECT COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS p
  WHERE p.id = p_project_id
  LIMIT 1;

  IF reservation_minutes IS NULL OR reservation_minutes < 0 THEN
    reservation_minutes := 60;
  END IF;

  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Clean up expired reservations for this project before claiming
  UPDATE public.tasks AS t
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL
  WHERE t.project_id = p_project_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at < reservation_threshold;

  SELECT
    q.id,
    q.project_id,
    q.question_id,
    q.row_index,
    q.data,
    q.completed_replications,
    q.required_replications,
    q.is_answered,
    q.created_at
  INTO
    question_id,
    question_project_id,
    question_question_id,
    question_row_index,
    question_data,
    question_completed_replications,
    question_required_replications,
    question_is_answered,
    question_created_at
  FROM public.questions AS q
  WHERE q.project_id = p_project_id
    AND q.is_answered = FALSE
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1
      FROM public.tasks AS t
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
  )
  VALUES (
    question_project_id,
    question_id,
    question_row_index,
    question_data,
    'assigned',
    p_worker_id,
    NOW()
  );

  -- Return the question data
  RETURN QUERY SELECT
    question_id,
    question_project_id,
    question_question_id,
    question_row_index,
    question_data,
    question_completed_replications,
    question_required_replications,
    question_is_answered,
    question_created_at;
END;
$$;
-- Harden claim_next_available_question to avoid ambiguous column references
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
  reservation_threshold TIMESTAMPTZ;
  reservation_minutes INTEGER;
  selected_question RECORD;
BEGIN
  -- Determine reservation limit for the project (default to 60 minutes)
  SELECT COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS p
  WHERE p.id = p_project_id
  LIMIT 1;

  IF reservation_minutes IS NULL OR reservation_minutes < 0 THEN
    reservation_minutes := 60;
  END IF;

  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Clean up expired reservations for this project before claiming
  UPDATE public.tasks AS t
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL
  WHERE t.project_id = p_project_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at < reservation_threshold;

  -- Find and claim the next available question atomically
  SELECT
    q.id,
    q.project_id,
    q.question_id,
    q.row_index,
    q.data,
    q.completed_replications,
    q.required_replications,
    q.is_answered,
    q.created_at
  INTO selected_question
  FROM public.questions AS q
  WHERE q.project_id = p_project_id
    AND q.is_answered = FALSE
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1
      FROM public.tasks AS t
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
  )
  VALUES (
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

