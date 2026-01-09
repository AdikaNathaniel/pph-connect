BEGIN;

-- This is the definitive, production-ready version of the claim function.
-- It fixes the "ambiguous column" error by explicitly qualifying the 'id' in the RETURNING clause.

-- STEP 1: Clean slate for the function
DROP FUNCTION IF EXISTS public.claim_next_available_question(UUID, UUID);

-- STEP 2: Recreate the function with the ambiguity fix
CREATE OR REPLACE FUNCTION public.claim_next_available_question(
  p_project_id UUID,
  p_worker_id UUID
)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  question_id TEXT,
  row_index INTEGER,
  data JSONB,
  completed_replications INTEGER,
  required_replications INTEGER,
  is_answered BOOLEAN,
  created_at TIMESTAMPTZ,
  reservation_task_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_minutes INTEGER;
  reservation_threshold TIMESTAMPTZ;
  existing_task public.tasks%ROWTYPE;
  selected_question RECORD;
  new_task_id UUID;
BEGIN
  -- Get reservation time limit (default 60 minutes)
  SELECT COALESCE(NULLIF(proj.reservation_time_limit_minutes, 0), 60)
  INTO reservation_minutes
  FROM public.projects AS proj
  WHERE proj.id = p_project_id;
  
  reservation_minutes := COALESCE(reservation_minutes, 60);
  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- 1: Clean up expired reservations for this worker across ALL projects
  UPDATE public.tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE public.tasks.assigned_to = p_worker_id
    AND public.tasks.status IN ('assigned', 'in_progress')
    AND (public.tasks.assigned_at IS NULL OR public.tasks.assigned_at < reservation_threshold);

  -- 2: Check if worker has an active reservation for THIS project
  SELECT t.*
  INTO existing_task
  FROM public.tasks AS t
  WHERE t.project_id = p_project_id
    AND t.assigned_to = p_worker_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at >= reservation_threshold
  ORDER BY t.assigned_at DESC
  LIMIT 1;

  -- If found, return the existing reservation
  IF FOUND THEN
    RETURN QUERY
    SELECT q.id, q.project_id, q.question_id, q.row_index, q.data, q.completed_replications, q.required_replications, q.is_answered, q.created_at, existing_task.id
    FROM public.questions AS q WHERE q.id = existing_task.question_id;
    RETURN;
  END IF;

  -- 3: Check if worker has ANY active reservation (different project)
  SELECT t.*
  INTO existing_task
  FROM public.tasks AS t
  WHERE t.assigned_to = p_worker_id
    AND t.status IN ('assigned', 'in_progress')
    AND t.assigned_at >= reservation_threshold
  LIMIT 1;

  -- If worker has a reservation for a different project, return empty
  IF FOUND THEN
    RETURN;
  END IF;

  -- 4: Clean up expired reservations for the target project
  UPDATE public.tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE public.tasks.project_id = p_project_id
    AND public.tasks.status IN ('assigned', 'in_progress')
    AND (public.tasks.assigned_at IS NULL OR public.tasks.assigned_at < reservation_threshold);

  -- 5: Find next available question
  SELECT q.id, q.project_id, q.question_id, q.row_index, q.data, q.completed_replications, q.required_replications, q.is_answered, q.created_at
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

  -- If no question available, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 6: Create task reservation
  INSERT INTO public.tasks (project_id, question_id, row_index, data, status, assigned_to, assigned_at)
  VALUES (selected_question.project_id, selected_question.id, selected_question.row_index, selected_question.data, 'assigned', p_worker_id, NOW())
  RETURNING public.tasks.id INTO new_task_id; -- <<< THE FIX IS HERE: "public.tasks.id"

  -- 7: Return the question
  RETURN QUERY SELECT
    selected_question.id, selected_question.project_id, selected_question.question_id, selected_question.row_index,
    selected_question.data, selected_question.completed_replications, selected_question.required_replications,
    selected_question.is_answered, selected_question.created_at, new_task_id;

EXCEPTION
  -- Final safeguard: Catch any other error, log it, and return empty.
  WHEN OTHERS THEN
    RAISE WARNING '[claim_next_available_question] CRITICAL FAILURE for worker % on project %. SQLSTATE: %, SQLERRM: %', p_worker_id, p_project_id, SQLSTATE, SQLERRM;
    RETURN;
END;
$$;

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.claim_next_available_question(UUID, UUID) TO authenticated;

COMMIT;
