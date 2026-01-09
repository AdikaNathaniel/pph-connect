-- Migration: Create Achievements Tables
-- Created: 2025-11-17
-- Purpose: Store achievement definitions and worker-earned achievements.

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.worker_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  achievement_id uuid NOT NULL REFERENCES public.achievements(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_achievements_unique
  ON public.worker_achievements(worker_id, achievement_id);

ALTER TABLE public.worker_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers and managers can view worker achievements"
  ON public.worker_achievements
  FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid() OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));

CREATE POLICY "Managers can manage worker achievements"
  ON public.worker_achievements
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
