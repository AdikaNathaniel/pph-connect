-- Migration: Add gold standard metadata to questions
-- Created: 2025-11-12
-- Purpose: Store gold standard flags/answers for automated quality checks
--
-- ============================================================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS is_gold_standard boolean DEFAULT false NOT NULL;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS correct_answer jsonb;

COMMENT ON COLUMN public.questions.is_gold_standard IS 'Indicates whether the row is a seeded gold standard question';
COMMENT ON COLUMN public.questions.correct_answer IS 'Canonical answer payload used for gold standard evaluation';

CREATE INDEX IF NOT EXISTS idx_questions_gold_standard
  ON public.questions (project_id)
  WHERE is_gold_standard IS TRUE;
