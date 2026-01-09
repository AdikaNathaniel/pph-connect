BEGIN;

-- Harden claim_next_review_task against ambiguous references between columns and
-- the RETURN TABLE aliases by fully qualifying every table column.
CREATE OR REPLACE FUNCTION public.claim_next_review_task(
  p_project_id UUID,
  p_worker_id UUID
)
RETURNS TABLE(
  review_task_id UUID,
  project_id UUID,
  question_uuid UUID,
  answer_uuid UUID,
  status TEXT,
  question_id TEXT,
  question_data JSONB,
  answer_data JSONB,
  answer_id TEXT,
  transcriber_uuid UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_minutes INTEGER;
  reservation_threshold TIMESTAMPTZ;
  task_row public.review_tasks%ROWTYPE;
BEGIN
  SELECT COALESCE(NULLIF(proj.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS proj
  WHERE proj.id = p_project_id;

  reservation_minutes := COALESCE(reservation_minutes, 60);
  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Release stale reservations scoped to the project
  UPDATE public.review_tasks AS rt
     SET status = 'pending',
         assigned_to = NULL,
         assigned_at = NULL,
         updated_at = NOW()
   WHERE rt.project_id = p_project_id
     AND rt.status = 'assigned'
     AND rt.assigned_at < reservation_threshold;

  -- Return an active reservation if the worker already has one
  SELECT *
    INTO task_row
    FROM public.review_tasks AS rt
   WHERE rt.project_id = p_project_id
     AND rt.assigned_to = p_worker_id
     AND rt.status = 'assigned'
   ORDER BY rt.assigned_at DESC
   LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT task_row.id,
           task_row.project_id,
           task_row.question_uuid,
           task_row.answer_uuid,
           task_row.status,
           q.question_id,
           q.data,
           ans.answer_data,
           ans.answer_id,
           ans.worker_id
      FROM public.questions AS q
      JOIN public.answers AS ans ON ans.id = task_row.answer_uuid
     WHERE q.id = task_row.question_uuid;
    RETURN;
  END IF;

  -- Reserve the next available review task for this project
  UPDATE public.review_tasks AS rt
     SET status = 'assigned',
         assigned_to = p_worker_id,
         assigned_at = NOW(),
         updated_at = NOW()
   WHERE rt.id = (
           SELECT inner_rt.id
             FROM public.review_tasks AS inner_rt
            WHERE inner_rt.project_id = p_project_id
              AND inner_rt.status = 'pending'
         ORDER BY inner_rt.created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
         )
  RETURNING rt.* INTO task_row;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT task_row.id,
         task_row.project_id,
         task_row.question_uuid,
         task_row.answer_uuid,
         task_row.status,
         q.question_id,
         q.data,
         ans.answer_data,
         ans.answer_id,
         ans.worker_id
    FROM public.questions AS q
    JOIN public.answers AS ans ON ans.id = task_row.answer_uuid
   WHERE q.id = task_row.question_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_review_task(UUID, UUID) TO authenticated;

-- Surface available review tasks for dashboards (pending tasks plus any reserved by the worker)
CREATE OR REPLACE FUNCTION public.count_available_review_tasks(
  p_project_id UUID,
  p_worker_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_minutes INTEGER;
  reservation_threshold TIMESTAMPTZ;
  available_count INTEGER;
BEGIN
  SELECT COALESCE(NULLIF(proj.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS proj
  WHERE proj.id = p_project_id;

  reservation_minutes := COALESCE(reservation_minutes, 60);
  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  UPDATE public.review_tasks AS rt
     SET status = 'pending',
         assigned_to = NULL,
         assigned_at = NULL,
         updated_at = NOW()
   WHERE rt.project_id = p_project_id
     AND rt.status = 'assigned'
     AND rt.assigned_at < reservation_threshold;

  SELECT COUNT(*)
    INTO available_count
    FROM public.review_tasks AS rt
   WHERE rt.project_id = p_project_id
     AND (
       rt.status = 'pending'
       OR (rt.status = 'assigned' AND rt.assigned_to = p_worker_id)
     );

  RETURN COALESCE(available_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_available_review_tasks(UUID, UUID) TO authenticated;

COMMIT;
