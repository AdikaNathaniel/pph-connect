BEGIN;

CREATE OR REPLACE FUNCTION public.get_question_status_analytics(
  p_project_id UUID DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_modality TEXT[] DEFAULT NULL,
  p_transcriber_id UUID DEFAULT NULL,
  p_reviewer_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_updated_from TIMESTAMPTZ DEFAULT NULL,
  p_updated_to TIMESTAMPTZ DEFAULT NULL,
  p_sort_column TEXT DEFAULT 'updated_at',
  p_sort_direction TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  question_uuid UUID,
  question_id TEXT,
  project_id UUID,
  project_name TEXT,
  project_status TEXT,
  template_modality TEXT,
  replication_index INTEGER,
  current_status TEXT,
  asset_source_id TEXT,
  audio_asset_id UUID,
  audio_asset_status TEXT,
  audio_asset_error TEXT,
  audio_file_name TEXT,
  supabase_audio_path TEXT,
  transcription_task_uuid UUID,
  transcription_answer_uuid UUID,
  transcription_answer_id TEXT,
  transcription_answer_data JSONB,
  transcriber_uuid UUID,
  transcription_submitted_at TIMESTAMPTZ,
  review_task_uuid UUID,
  review_submission_uuid UUID,
  review_id TEXT,
  review_payload JSONB,
  reviewer_uuid UUID,
  review_submitted_at TIMESTAMPTZ,
  qc_record_uuid UUID,
  qc_id TEXT,
  qc_payload JSONB,
  final_answer_uuid UUID,
  final_answer_id TEXT,
  final_deliverable JSONB,
  deliverable_url TEXT,
  finalized_at TIMESTAMPTZ,
  skip_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_rows BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sort_column TEXT := lower(COALESCE(p_sort_column, 'updated_at'));
  v_sort_direction TEXT := lower(COALESCE(p_sort_direction, 'desc'));
  v_order_expr TEXT;
BEGIN
  IF v_sort_direction NOT IN ('asc', 'desc') THEN
    v_sort_direction := 'desc';
  END IF;

  v_order_expr := CASE v_sort_column
    WHEN 'question_id' THEN 'qas.question_id'
    WHEN 'project_name' THEN 'p.name'
    WHEN 'current_status' THEN 'qas.current_status'
    WHEN 'audio_asset_status' THEN 'aa.status'
    WHEN 'transcription_submitted_at' THEN 'qas.transcription_submitted_at'
    WHEN 'review_submitted_at' THEN 'qas.review_submitted_at'
    WHEN 'finalized_at' THEN 'qas.finalized_at'
    WHEN 'created_at' THEN 'qas.created_at'
    ELSE 'qas.updated_at'
  END;

  RETURN QUERY EXECUTE format('
    SELECT
      qas.question_uuid,
      qas.question_id,
      qas.project_id,
      p.name AS project_name,
      p.status AS project_status,
      tt.modality AS template_modality,
      qas.replication_index,
      qas.current_status,
      qas.asset_source_id,
      qas.audio_asset_id,
      aa.status AS audio_asset_status,
      aa.error_message AS audio_asset_error,
      aa.drive_file_name AS audio_file_name,
      qas.supabase_audio_path,
      qas.transcription_task_uuid,
      qas.transcription_answer_uuid,
      ta.answer_id AS transcription_answer_id,
      ta.answer_data AS transcription_answer_data,
      qas.transcriber_uuid,
      qas.transcription_submitted_at,
      qas.review_task_uuid,
      qas.review_submission_uuid,
      rs.review_id,
      rs.review_payload,
      qas.reviewer_uuid,
      qas.review_submitted_at,
      qas.qc_record_uuid,
      qc.qc_id,
      qc.qc_payload,
      qas.final_answer_uuid,
      fa.final_answer_id,
      fa.deliverable AS final_deliverable,
      qas.deliverable_url,
      qas.finalized_at,
      qas.metadata ->> ''skip_reason'' AS skip_reason,
      qas.created_at,
      qas.updated_at,
      COUNT(*) OVER() AS total_rows
    FROM public.question_asset_status qas
    JOIN public.questions q
      ON q.id = qas.question_uuid
    JOIN public.projects p
      ON p.id = q.project_id
    JOIN public.task_templates tt
      ON tt.id = p.template_id
    LEFT JOIN public.audio_assets aa
      ON aa.id = qas.audio_asset_id
    LEFT JOIN public.answers ta
      ON ta.id = qas.transcription_answer_uuid
    LEFT JOIN public.review_submissions rs
      ON rs.id = qas.review_submission_uuid
    LEFT JOIN public.final_answers fa
      ON fa.id = qas.final_answer_uuid
    LEFT JOIN public.qc_records qc
      ON qc.id = qas.qc_record_uuid
    WHERE ($1 IS NULL OR qas.project_id = $1)
      AND ($2 IS NULL OR qas.current_status = ANY($2))
      AND ($3 IS NULL OR tt.modality = ANY($3))
      AND ($4 IS NULL OR qas.transcriber_uuid = $4)
      AND ($5 IS NULL OR qas.reviewer_uuid = $5)
      AND (
        $6 IS NULL OR $6 = '''' OR
        qas.question_id ILIKE ''%%'' || $6 || ''%%'' OR
        p.name ILIKE ''%%'' || $6 || ''%%'' OR
        COALESCE(aa.drive_file_name, '''') ILIKE ''%%'' || $6 || ''%%'' OR
        COALESCE(qas.asset_source_id, '''') ILIKE ''%%'' || $6 || ''%%''
      )
      AND ($7 IS NULL OR qas.updated_at >= $7)
      AND ($8 IS NULL OR qas.updated_at <= $8)
    ORDER BY %s %s, qas.updated_at DESC
    LIMIT GREATEST(1, COALESCE($9, 100))
    OFFSET GREATEST(0, COALESCE($10, 0));
  ', v_order_expr, CASE WHEN v_sort_direction = 'asc' THEN 'ASC' ELSE 'DESC' END)
  USING p_project_id, p_status, p_modality, p_transcriber_id, p_reviewer_id, p_search, p_updated_from, p_updated_to, p_limit, p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_question_status_analytics(UUID, TEXT[], TEXT[], UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INTEGER, INTEGER)
IS 'Returns question asset ledger rows with project/template metadata, state identifiers, JSON payloads, audio asset state, and pagination support.';

COMMIT;
