BEGIN;

-- 1. Create dedicated bucket for audio assets (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-assets', 'audio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Reset storage policies for audio assets bucket to ensure desired access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read audio assets'
  ) THEN
    EXECUTE 'DROP POLICY "Public can read audio assets" ON storage.objects';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role can manage audio assets'
  ) THEN
    EXECUTE 'DROP POLICY "Service role can manage audio assets" ON storage.objects';
  END IF;
END$$;

CREATE POLICY "Public can read audio assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-assets');

CREATE POLICY "Service role can manage audio assets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'audio-assets')
WITH CHECK (bucket_id = 'audio-assets');

-- 3. Create audio_assets table to track ingestion lifecycle
CREATE TABLE IF NOT EXISTS public.audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'transferring', 'ready', 'failed', 'archived')),
  error_message TEXT,
  ingested_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_project ON public.audio_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_status ON public.audio_assets(status);

-- Ensure updated_at is maintained automatically
DROP TRIGGER IF EXISTS trg_audio_assets_updated_at ON public.audio_assets;
CREATE TRIGGER trg_audio_assets_updated_at
BEFORE UPDATE ON public.audio_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Extend questions with optional Supabase audio linkage
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supabase_audio_path TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_audio_asset_id ON public.questions(audio_asset_id);

-- 5. Extend question_asset_status ledger for Supabase-backed assets
ALTER TABLE public.question_asset_status
  ADD COLUMN IF NOT EXISTS audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supabase_audio_path TEXT;

CREATE INDEX IF NOT EXISTS idx_question_asset_status_audio_asset_id
ON public.question_asset_status(audio_asset_id);

COMMENT ON TABLE public.audio_assets IS 'Tracks Google Drive audio files copied into Supabase Storage for low-latency streaming.';
COMMENT ON COLUMN public.questions.audio_asset_id IS 'Optional reference to the Supabase audio asset used for this question.';
COMMENT ON COLUMN public.questions.supabase_audio_path IS 'Supabase Storage path for the audio asset associated with this question.';
COMMENT ON COLUMN public.question_asset_status.audio_asset_id IS 'Optional reference to the Supabase audio asset captured in the status ledger.';
COMMENT ON COLUMN public.question_asset_status.supabase_audio_path IS 'Supabase Storage path recorded when the asset status was updated.';

-- 6. Refresh asset status helpers to populate new columns
CREATE OR REPLACE FUNCTION public.init_question_asset_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.question_asset_status (
    project_id,
    question_uuid,
    question_id,
    replication_index,
    asset_source_id,
    audio_asset_id,
    supabase_audio_path,
    current_status,
    metadata
  ) VALUES (
    NEW.project_id,
    NEW.id,
    NEW.question_id,
    COALESCE(NEW.row_index, 1),
    NEW.data ->> 'drive_file_id',
    NEW.audio_asset_id,
    NEW.supabase_audio_path,
    'pending',
    COALESCE(NEW.data, '{}'::JSONB)
  )
  ON CONFLICT (question_uuid) DO UPDATE
  SET asset_source_id = COALESCE(EXCLUDED.asset_source_id, public.question_asset_status.asset_source_id),
      audio_asset_id = COALESCE(EXCLUDED.audio_asset_id, public.question_asset_status.audio_asset_id),
      supabase_audio_path = COALESCE(EXCLUDED.supabase_audio_path, public.question_asset_status.supabase_audio_path),
      metadata = COALESCE(EXCLUDED.metadata, public.question_asset_status.metadata),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

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

COMMIT;
