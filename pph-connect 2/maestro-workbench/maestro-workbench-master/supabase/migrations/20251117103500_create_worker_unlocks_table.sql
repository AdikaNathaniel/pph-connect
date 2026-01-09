-- Migration: Create Worker Unlocks Table
-- Created: 2025-11-17
-- Purpose: Track difficulty levels unlocked per worker.

CREATE TABLE IF NOT EXISTS public.worker_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  difficulty_level public.task_difficulty_level NOT NULL,
  source text NOT NULL DEFAULT 'manager',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_unlocks_worker_level
  ON public.worker_unlocks(worker_id, difficulty_level);

ALTER TABLE public.worker_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers and managers can view unlocks"
  ON public.worker_unlocks
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Managers can manage unlocks"
  ON public.worker_unlocks
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
