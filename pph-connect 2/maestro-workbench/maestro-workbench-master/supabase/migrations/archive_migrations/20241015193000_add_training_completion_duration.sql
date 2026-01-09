-- Add duration tracking to worker training completions
BEGIN;

ALTER TABLE public.worker_training_completions
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.worker_training_completions
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

UPDATE public.worker_training_completions
SET started_at = COALESCE(started_at, completed_at)
WHERE started_at IS NULL;

COMMIT;
