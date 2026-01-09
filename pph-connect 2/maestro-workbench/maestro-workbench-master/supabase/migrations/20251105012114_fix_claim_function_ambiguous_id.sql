-- Migration: Fix ambiguous 'id' reference in claim_next_available_question function
-- Created: 2025-11-05
-- Purpose: Resolve PostgreSQL error "column reference 'id' is ambiguous"
--          by qualifying the id column in RETURNING clause
--
-- Error Details:
--   Code: 42702
--   Message: column reference "id" is ambiguous
--   Details: It could refer to either a PL/pgSQL variable or a table column
--
-- Fix: Change RETURNING id to RETURNING tasks.id at line 221
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") RETURNS TABLE("id" "uuid", "project_id" "uuid", "question_id" "text", "row_index" integer, "data" "jsonb", "completed_replications" integer, "required_replications" integer, "is_answered" boolean, "created_at" timestamp with time zone, "reservation_task_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_question_record RECORD;
    v_task_id UUID;
    v_reservation_time_limit INTEGER;
    v_existing_reservation_task_id UUID;
    v_existing_reservation_project_id UUID;
BEGIN
    -- Get project reservation time limit
    SELECT COALESCE(reservation_time_limit_minutes, 60)
    INTO v_reservation_time_limit
    FROM public.projects
    WHERE id = p_project_id;

    -- Clean up expired reservations for this worker across all projects
    UPDATE public.tasks t
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    FROM public.projects p
    WHERE t.project_id = p.id
      AND t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1));

    -- Check if worker already has an active reservation for THIS project
    SELECT t.id, t.project_id
    INTO v_existing_reservation_task_id, v_existing_reservation_project_id
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1))
      AND t.project_id = p_project_id
    LIMIT 1;

    -- If worker has existing reservation for this project, return it
    IF v_existing_reservation_task_id IS NOT NULL THEN
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
            q.created_at,
            v_existing_reservation_task_id AS reservation_task_id
        FROM public.questions q
        JOIN public.tasks t ON t.question_id = q.id
        WHERE t.id = v_existing_reservation_task_id;
        RETURN;
    END IF;

    -- Check if worker has active reservation for DIFFERENT project (block new claim)
    SELECT t.id
    INTO v_existing_reservation_task_id
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1))
      AND t.project_id != p_project_id
    LIMIT 1;

    -- If worker has reservation for different project, return empty
    IF v_existing_reservation_task_id IS NOT NULL THEN
        RETURN;
    END IF;

    -- Clean up expired reservations for target project
    UPDATE public.tasks t
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    WHERE t.project_id = p_project_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => v_reservation_time_limit);

    -- Find next available question with row-level locking
    SELECT q.*
    INTO v_question_record
    FROM public.questions q
    WHERE q.project_id = p_project_id
      AND q.is_answered = false
      AND q.completed_replications < q.required_replications
      AND NOT EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.question_id = q.id
            AND t.status IN ('assigned', 'in_progress')
            AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => v_reservation_time_limit)
      )
    ORDER BY q.row_index
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no question found, return empty
    IF v_question_record.id IS NULL THEN
        RETURN;
    END IF;

    -- Create task reservation
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
        p_project_id,
        v_question_record.id,
        v_question_record.row_index,
        v_question_record.data,
        'assigned',
        p_worker_id,
        NOW()
    )
    RETURNING tasks.id INTO v_task_id;  -- FIX: Qualified 'id' as 'tasks.id' to avoid ambiguity

    -- Return question data with reservation task ID
    RETURN QUERY
    SELECT
        v_question_record.id,
        v_question_record.project_id,
        v_question_record.question_id,
        v_question_record.row_index,
        v_question_record.data,
        v_question_record.completed_replications,
        v_question_record.required_replications,
        v_question_record.is_answered,
        v_question_record.created_at,
        v_task_id AS reservation_task_id;
END;
$$;

COMMENT ON FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") IS 'Atomically claim next available question with reservation system';
