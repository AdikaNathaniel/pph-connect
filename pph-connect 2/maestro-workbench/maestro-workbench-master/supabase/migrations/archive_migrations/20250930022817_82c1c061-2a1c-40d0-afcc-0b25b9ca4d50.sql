-- Create table to persist task answer events (e.g., paste detections)
CREATE TABLE IF NOT EXISTS public.task_answer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  task_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  event_type text NOT NULL,
  field_id text,
  field_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_answer_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Root and managers can view all events" ON public.task_answer_events;
DROP POLICY IF EXISTS "Workers can insert their own events" ON public.task_answer_events;
DROP POLICY IF EXISTS "Workers can view their own events" ON public.task_answer_events;

-- Create policies
CREATE POLICY "Root and managers can view all events"
  ON public.task_answer_events FOR SELECT
  USING (public.is_root_or_manager(auth.uid()));

CREATE POLICY "Workers can insert their own events"
  ON public.task_answer_events FOR INSERT
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Workers can view their own events"
  ON public.task_answer_events FOR SELECT
  USING (worker_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_answer_events_project ON public.task_answer_events(project_id);
CREATE INDEX IF NOT EXISTS idx_task_answer_events_task ON public.task_answer_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_answer_events_worker ON public.task_answer_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_answer_events_created_at ON public.task_answer_events(created_at);
