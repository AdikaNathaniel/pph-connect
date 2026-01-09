-- Create table for capturing client-side console and error logs from workers
CREATE TABLE IF NOT EXISTS public.client_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  context TEXT,
  metadata JSONB,
  stack TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS so only authorized users can view/insert logs
ALTER TABLE public.client_logs ENABLE ROW LEVEL SECURITY;

-- Workers can insert logs for themselves
CREATE POLICY "Workers can insert client logs" ON public.client_logs
FOR INSERT
WITH CHECK (auth.uid() = worker_id);

-- Managers/root can view all logs
CREATE POLICY "Managers can view client logs" ON public.client_logs
FOR SELECT
USING (public.is_root_or_manager(auth.uid()));

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_client_logs_worker_id ON public.client_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_project_id ON public.client_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_client_logs_occurred_at ON public.client_logs(occurred_at DESC);

