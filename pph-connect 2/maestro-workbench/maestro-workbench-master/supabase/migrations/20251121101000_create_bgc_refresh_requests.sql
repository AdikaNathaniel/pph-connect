-- Migration: Create BGC Refresh Requests Table
-- Description: Track automated background check re-initiation requests triggered by monitoring job.

CREATE TABLE IF NOT EXISTS public.bgc_refresh_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bgc_refresh_worker ON public.bgc_refresh_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_bgc_refresh_status ON public.bgc_refresh_requests(status);

ALTER TABLE public.bgc_refresh_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage BGC refresh requests"
  ON public.bgc_refresh_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('root','admin')
    )
  );
