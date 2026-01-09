BEGIN;

-- Ensure transcription status updates run with elevated privileges so workers can trigger them.
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_audio_asset_id UUID;
  v_supabase_audio_path TEXT;
BEGIN
  SELECT audio_asset_id, supabase_audio_path
  INTO v_audio_asset_id, v_supabase_audio_path
  FROM public.questions
  WHERE id = p_question_uuid;

  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    asset_source_id,
    audio_asset_id,
    supabase_audio_path,
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
    v_audio_asset_id,
    v_supabase_audio_path,
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
      audio_asset_id = COALESCE(EXCLUDED.audio_asset_id, public.question_asset_status.audio_asset_id),
      supabase_audio_path = COALESCE(EXCLUDED.supabase_audio_path, public.question_asset_status.supabase_audio_path),
      current_status = 'review_pending',
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_question_asset_status_after_transcription(
  UUID, UUID, TEXT, INTEGER, TEXT, UUID, UUID, UUID, TIMESTAMPTZ
) TO authenticated;

COMMIT;
