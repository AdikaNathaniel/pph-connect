BEGIN;

-- Provide a question-aware availability count aligned with reservation limits
CREATE OR REPLACE FUNCTION public.count_claimable_questions(p_project_id UUID)
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
  -- Derive project-specific reservation window (defaulting to 60 minutes)
  SELECT COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS p
  WHERE p.id = p_project_id
  LIMIT 1;

  IF reservation_minutes IS NULL OR reservation_minutes < 0 THEN
    reservation_minutes := 60;
  END IF;

  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  -- Count questions that can be claimed without violating existing reservations
  SELECT COUNT(*)
    INTO available_count
  FROM public.questions AS q
  WHERE q.project_id = p_project_id
    AND q.is_answered = FALSE
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1
      FROM public.tasks AS t
      WHERE t.question_id = q.id
        AND t.status IN ('assigned', 'in_progress')
        AND (
          t.assigned_at IS NULL
          OR t.assigned_at >= reservation_threshold
        )
    );

  RETURN COALESCE(available_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_claimable_questions(UUID) TO authenticated;

-- Surface active reservation counts for a worker within the reservation window
CREATE OR REPLACE FUNCTION public.count_active_reservations_for_worker(
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
  reservation_count INTEGER;
BEGIN
  SELECT COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60)
    INTO reservation_minutes
  FROM public.projects AS p
  WHERE p.id = p_project_id
  LIMIT 1;

  IF reservation_minutes IS NULL OR reservation_minutes < 0 THEN
    reservation_minutes := 60;
  END IF;

  reservation_threshold := NOW() - MAKE_INTERVAL(mins => reservation_minutes);

  SELECT COUNT(*)
    INTO reservation_count
  FROM public.tasks AS t
  WHERE t.project_id = p_project_id
    AND t.assigned_to = p_worker_id
    AND t.status IN ('assigned', 'in_progress')
    AND (
      t.assigned_at IS NULL
      OR t.assigned_at >= reservation_threshold
    );

  RETURN COALESCE(reservation_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_active_reservations_for_worker(UUID, UUID) TO authenticated;

COMMIT;

