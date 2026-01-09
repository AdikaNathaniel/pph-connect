-- Migration: Create Task Reassignment Events Table
-- Created: 2025-11-12
-- Purpose: Log low-quality task reassignment events for auditing.
--
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_reassignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_worker_id uuid NOT NULL REFERENCES public.workers(id),
  to_worker_id uuid REFERENCES public.workers(id),
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_reassignment_task
  ON public.task_reassignment_events(task_id);

CREATE INDEX IF NOT EXISTS idx_task_reassignment_from_worker
  ON public.task_reassignment_events(from_worker_id);

ALTER TABLE public.task_reassignment_events
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task reassignment events"
  ON public.task_reassignment_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage task reassignment events"
  ON public.task_reassignment_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root', 'admin')
    )
  );
