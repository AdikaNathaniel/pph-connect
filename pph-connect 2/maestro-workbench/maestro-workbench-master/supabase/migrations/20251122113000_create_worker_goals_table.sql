-- Migration: Create Worker Goals Table
-- Created: 2025-11-22
-- Purpose: Allow workers to set personal productivity goals and track progress.

DO $$
BEGIN
  CREATE TYPE public.worker_goal_type AS ENUM ('tasks', 'quality', 'earnings');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.worker_goal_period AS ENUM ('weekly', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.worker_goal_status AS ENUM ('active', 'completed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.worker_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  goal_type public.worker_goal_type NOT NULL,
  period public.worker_goal_period NOT NULL DEFAULT 'weekly',
  target_value numeric NOT NULL CHECK (target_value > 0),
  description text,
  start_date date NOT NULL DEFAULT current_date,
  end_date date NOT NULL DEFAULT (current_date + interval '7 days')::date,
  status public.worker_goal_status NOT NULL DEFAULT 'active',
  progress_value numeric NOT NULL DEFAULT 0,
  progress_percent numeric NOT NULL DEFAULT 0,
  celebrated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_goals_worker
  ON public.worker_goals(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_goals_status
  ON public.worker_goals(status);

ALTER TABLE public.worker_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers view their goals"
  ON public.worker_goals
  FOR SELECT
  TO authenticated
  USING (
    worker_id = auth.uid()
    OR public.worker_has_role(auth.uid(), ARRAY['root','admin','manager'])
  );

CREATE POLICY "Workers manage their goals"
  ON public.worker_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers update their goals"
  ON public.worker_goals
  FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers delete their goals"
  ON public.worker_goals
  FOR DELETE
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Managers administer worker goals"
  ON public.worker_goals
  FOR ALL
  TO authenticated
  USING (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']))
  WITH CHECK (public.worker_has_role(auth.uid(), ARRAY['root','admin','manager']));
