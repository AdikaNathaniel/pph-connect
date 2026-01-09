-- Migration: Create Worker Applications Table
-- Created: 2025-11-06
-- Purpose: Track worker applications to project listings in the marketplace.
--
-- Changes:
--   1. Create application_status enum
--   2. Create public.worker_applications table with foreign keys and audit metadata
--
-- ============================================================================

-- Create application_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE public.application_status AS ENUM (
          'pending',
          'approved',
          'rejected'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.worker_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id),
  project_listing_id uuid NOT NULL REFERENCES public.project_listings(id),
  status public.application_status NOT NULL DEFAULT 'pending',
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL,
  reviewed_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_applications_worker
  ON public.worker_applications(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_applications_listing
  ON public.worker_applications(project_listing_id);

CREATE INDEX IF NOT EXISTS idx_worker_applications_status
  ON public.worker_applications(status);

ALTER TABLE public.worker_applications
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker applications"
  ON public.worker_applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker applications"
  ON public.worker_applications
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
