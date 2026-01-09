-- Migration: Create AI Interviews Table
-- Created: 2025-11-17
-- Purpose: Persist AI interview sessions, transcripts, and scores.
--
-- Schema:
--   ai_interviews
--     id uuid primary key
--     worker_id uuid references workers(id)
--     domain text
--     questions_asked jsonb
--     answers_given jsonb
--     transcript text
--     score numeric
--     confidence numeric
--     skill_verification_id uuid references skill_verifications(id)
--     conducted_at timestamptz default now()
--     created_at timestamptz default now()
--     updated_at timestamptz default now()

CREATE TABLE IF NOT EXISTS public.ai_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  domain text NOT NULL,
  questions_asked jsonb NOT NULL,
  answers_given jsonb NOT NULL,
  transcript text NOT NULL,
  score numeric(5,2) NOT NULL,
  confidence numeric(5,2) NOT NULL,
  skill_verification_id uuid REFERENCES public.skill_verifications(id),
  conducted_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'pending',
  review_notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_interviews_worker
  ON public.ai_interviews(worker_id);

CREATE INDEX IF NOT EXISTS idx_ai_interviews_skill_verification
  ON public.ai_interviews(skill_verification_id);

ALTER TABLE public.ai_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their AI interviews"
  ON public.ai_interviews
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Managers can manage AI interviews"
  ON public.ai_interviews
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
