BEGIN;

-- 1. Extend projects with ingestion progress telemetry
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS import_expected_assets INTEGER,
  ADD COLUMN IF NOT EXISTS import_ready_assets INTEGER,
  ADD COLUMN IF NOT EXISTS import_failed_assets INTEGER,
  ADD COLUMN IF NOT EXISTS import_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS import_last_updated TIMESTAMPTZ;

-- 2. Event log for audio asset ingestion/debugging
CREATE TABLE IF NOT EXISTS public.audio_asset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  audio_asset_id UUID REFERENCES public.audio_assets(id) ON DELETE CASCADE,
  drive_file_id TEXT,
  event_type TEXT NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_asset_events_project ON public.audio_asset_events(project_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_asset_events_asset ON public.audio_asset_events(audio_asset_id);

COMMENT ON TABLE public.audio_asset_events IS 'Debug log for audio asset ingestion/cleanup workflow.';
COMMENT ON COLUMN public.projects.import_expected_assets IS 'Total audio files detected during ingestion.';
COMMENT ON COLUMN public.projects.import_ready_assets IS 'Number of audio files successfully copied to Supabase.';
COMMENT ON COLUMN public.projects.import_failed_assets IS 'Number of audio files that failed to ingest.';
COMMENT ON COLUMN public.projects.import_started_at IS 'Timestamp when audio ingestion began.';
COMMENT ON COLUMN public.projects.import_last_updated IS 'Last time ingestion counters were updated.';

COMMIT;
