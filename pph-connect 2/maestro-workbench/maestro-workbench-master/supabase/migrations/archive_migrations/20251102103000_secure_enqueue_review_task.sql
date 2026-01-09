BEGIN;

-- Allow workers to enqueue review tasks even though review_tasks has RLS enabled by
-- running the logic with elevated privileges.
CREATE OR REPLACE FUNCTION public.enqueue_review_task(p_answer_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  answer_rec RECORD;
  template_has_review BOOLEAN;
  new_review_task UUID;
BEGIN
  SELECT a.id AS answer_uuid,
         a.project_id,
         a.question_id AS question_uuid,
         a.worker_id,
         a.completion_time,
         q.question_id,
         q.required_replications,
         q.data
    INTO answer_rec
    FROM public.answers AS a
    JOIN public.questions AS q ON q.id = a.question_id
   WHERE a.id = p_answer_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Answer % not found', p_answer_uuid;
  END IF;

  SELECT tpl.review_enabled
    INTO template_has_review
    FROM public.projects AS proj
    JOIN public.task_templates AS tpl ON tpl.id = proj.template_id
   WHERE proj.id = answer_rec.project_id;

  IF COALESCE(template_has_review, FALSE) IS FALSE THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.review_tasks (project_id, question_uuid, answer_uuid)
  VALUES (answer_rec.project_id, answer_rec.question_uuid, p_answer_uuid)
  ON CONFLICT (answer_uuid) DO UPDATE
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
  RETURNING id INTO new_review_task;

  PERFORM public.update_question_asset_status_after_transcription(
    answer_rec.project_id,
    answer_rec.question_uuid,
    answer_rec.question_id,
    1,
    answer_rec.data ->> 'drive_file_id',
    NULL,
    p_answer_uuid,
    answer_rec.worker_id,
    answer_rec.completion_time
  );

  RETURN new_review_task;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_review_task(UUID) TO authenticated;

-- Keep asset status updates working under RLS protections.
CREATE OR REPLACE FUNCTION public.update_question_asset_status_after_transcription(
  p_project_id UUID,
  p_question_uuid UUID,
  p_question_id TEXT,
  p_replication_index INTEGER,
  p_asset_source_id TEXT,
  p_task_uuid UUID,
  p_answer_uuid UUID,
  p_transcriber_uuid UUID,
  p_submitted_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    asset_source_id,
    current_status,
    transcription_task_uuid,
    transcription_answer_uuid,
    transcriber_uuid,
    transcription_submitted_at
  ) VALUES (
    p_project_id,
    p_question_uuid,
    p_question_id,
    COALESCE(p_replication_index, 1),
    p_asset_source_id,
    'review_pending',
    p_task_uuid,
    p_answer_uuid,
    p_transcriber_uuid,
    p_submitted_at
  )
  ON CONFLICT (question_uuid) DO UPDATE
  SET transcription_task_uuid = COALESCE(EXCLUDED.transcription_task_uuid, public.question_asset_status.transcription_task_uuid),
      transcription_answer_uuid = EXCLUDED.transcription_answer_uuid,
      transcriber_uuid = COALESCE(EXCLUDED.transcriber_uuid, public.question_asset_status.transcriber_uuid),
      transcription_submitted_at = EXCLUDED.transcription_submitted_at,
      asset_source_id = COALESCE(EXCLUDED.asset_source_id, public.question_asset_status.asset_source_id),
      current_status = 'review_pending',
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_question_asset_status_after_transcription(
  UUID,
  UUID,
  TEXT,
  INTEGER,
  TEXT,
  UUID,
  UUID,
  UUID,
  TIMESTAMPTZ
) TO authenticated;

-- Harden submit_review against ambiguous column references while keeping elevated privileges.
CREATE OR REPLACE FUNCTION public.submit_review(
  p_review_task_id UUID,
  p_reviewer_id UUID,
  p_rating_overall INTEGER,
  p_highlight_tags TEXT[],
  p_feedback TEXT,
  p_internal_notes TEXT,
  p_review_payload JSONB
)
RETURNS TABLE(
  review_submission_uuid UUID,
  review_id TEXT,
  final_answer_uuid UUID,
  final_answer_id TEXT,
  qc_record_uuid UUID,
  qc_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.review_tasks%ROWTYPE;
  question_row public.questions%ROWTYPE;
  answer_row public.answers%ROWTYPE;
  new_review_id TEXT;
  new_final_id TEXT;
  new_qc_id TEXT;
  review_uuid UUID;
  final_uuid UUID;
  qc_uuid UUID;
BEGIN
  SELECT *
  INTO task_row
  FROM public.review_tasks
  WHERE id = p_review_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review task % not found', p_review_task_id;
  END IF;

  IF task_row.assigned_to IS DISTINCT FROM p_reviewer_id THEN
    RAISE EXCEPTION 'Review task % is not assigned to reviewer %', p_review_task_id, p_reviewer_id;
  END IF;

  IF task_row.status = 'completed' THEN
    RAISE EXCEPTION 'Review task % already completed', p_review_task_id;
  END IF;

  SELECT *
  INTO question_row
  FROM public.questions
  WHERE id = task_row.question_uuid;

  SELECT *
  INTO answer_row
  FROM public.answers
  WHERE id = task_row.answer_uuid;

  new_review_id := public.generate_review_id(answer_row.answer_id);

  INSERT INTO public.review_submissions (
    review_id,
    project_id,
    question_uuid,
    answer_uuid,
    reviewer_id,
    review_payload,
    rating_overall,
    highlight_tags,
    feedback_to_transcriber,
    internal_notes
  ) VALUES (
    new_review_id,
    task_row.project_id,
    task_row.question_uuid,
    task_row.answer_uuid,
    p_reviewer_id,
    COALESCE(p_review_payload, '{}'::JSONB),
    p_rating_overall,
    COALESCE(p_highlight_tags, '{}'),
    p_feedback,
    p_internal_notes
  )
  RETURNING public.review_submissions.id, public.review_submissions.review_id
    INTO review_uuid, new_review_id;

  UPDATE public.review_tasks
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_review_task_id;

  new_final_id := public.generate_final_answer_id(question_row.question_id);

  INSERT INTO public.final_answers (
    final_answer_id,
    project_id,
    question_uuid,
    source_answer_uuid,
    review_submission_uuid,
    deliverable
  ) VALUES (
    new_final_id,
    task_row.project_id,
    task_row.question_uuid,
    task_row.answer_uuid,
    review_uuid,
    COALESCE(p_review_payload, '{}'::JSONB)
  )
  RETURNING public.final_answers.id, public.final_answers.final_answer_id
    INTO final_uuid, new_final_id;

  new_qc_id := public.generate_qc_id(new_review_id);

  INSERT INTO public.qc_records (
    qc_id,
    project_id,
    question_uuid,
    review_submission_uuid
  ) VALUES (
    new_qc_id,
    task_row.project_id,
    task_row.question_uuid,
    review_uuid
  )
  RETURNING id INTO qc_uuid;

  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    current_status,
    review_task_uuid,
    review_submission_uuid,
    qc_record_uuid,
    final_answer_uuid,
    reviewer_uuid,
    review_submitted_at,
    qc_created_at,
    finalized_at,
    deliverable_url
  ) VALUES (
    task_row.project_id,
    task_row.question_uuid,
    question_row.question_id,
    1,
    'completed',
    p_review_task_id,
    review_uuid,
    qc_uuid,
    final_uuid,
    p_reviewer_id,
    NOW(),
    NOW(),
    NOW(),
    NULL
  )
  ON CONFLICT (question_uuid) DO UPDATE
  SET review_task_uuid = EXCLUDED.review_task_uuid,
      review_submission_uuid = EXCLUDED.review_submission_uuid,
      qc_record_uuid = EXCLUDED.qc_record_uuid,
      final_answer_uuid = EXCLUDED.final_answer_uuid,
      reviewer_uuid = EXCLUDED.reviewer_uuid,
      review_submitted_at = EXCLUDED.review_submitted_at,
      qc_created_at = EXCLUDED.qc_created_at,
      finalized_at = EXCLUDED.finalized_at,
      current_status = 'completed',
      updated_at = NOW();

  UPDATE public.questions
  SET completed_replications = LEAST(required_replications, completed_replications + 1),
      is_answered = completed_replications + 1 >= required_replications,
      updated_at = NOW()
  WHERE id = question_row.id;

  RETURN QUERY
  SELECT review_uuid,
         new_review_id,
         final_uuid,
         new_final_id,
         qc_uuid,
         new_qc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_review(
  UUID,
  UUID,
  INTEGER,
  TEXT[],
  TEXT,
  TEXT,
  JSONB
) TO authenticated;

-- Let release_review_task clear reservations despite RLS.
CREATE OR REPLACE FUNCTION public.release_review_task(p_review_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released BOOLEAN;
BEGIN
  UPDATE public.review_tasks
  SET status = 'pending',
      assigned_to = NULL,
      assigned_at = NULL,
      updated_at = NOW()
  WHERE id = p_review_task_id
    AND status = 'assigned';

  GET DIAGNOSTICS released = ROW_COUNT;
  RETURN released;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_review_task(UUID) TO authenticated;

COMMIT;
