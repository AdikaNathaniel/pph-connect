BEGIN;
-- Update claim_next_available_question to resume existing reservations before creating new ones
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
  reservation_minutes INTEGER;
  reservation_threshold TIMESTAMPTZ;
  resumed_task public.tasks%ROWTYPE;
  selected_question RECORD;
  inserted_task_id UUID;
  conflicted_constraint TEXT;
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

  -- Attempt to resume existing reservation for this worker
  SELECT t.*
  INTO resumed_task
  FROM public.tasks AS t
  WHERE t.project_id = p_project_id
    AND t.assigned_to = p_worker_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at >= reservation_threshold
  ORDER BY t.assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY
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
    FROM public.questions AS q
    WHERE q.id = resumed_task.question_id;
    RETURN;
  END IF;

  -- Clean up expired reservations for this project before claiming
  UPDATE public.tasks AS t
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL
  WHERE t.project_id = p_project_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at < reservation_threshold;

  -- Find the next available question atomically
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

  -- Create or reuse task reservation for this worker
  inserted_task_id := NULL;
  BEGIN
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
    )
    RETURNING id INTO inserted_task_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS conflicted_constraint = CONSTRAINT_NAME;
    IF conflicted_constraint IS NULL OR conflicted_constraint <> 'idx_tasks_one_active_reservation' THEN
      RAISE;
    END IF;
    inserted_task_id := NULL;
  END;

  -- If the insert conflicted, return the existing reservation instead
  IF inserted_task_id IS NULL THEN
    SELECT t.*
    INTO resumed_task
    FROM public.tasks AS t
    WHERE t.project_id = p_project_id
      AND t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= reservation_threshold
    ORDER BY t.assigned_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      RETURN QUERY
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
      FROM public.questions AS q
      WHERE q.id = resumed_task.question_id;
      RETURN;
    ELSE
      -- No reservation found, nothing to return
      RETURN;
    END IF;
  END IF;

  -- Return the question data for the newly created reservation
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
COMMIT;
