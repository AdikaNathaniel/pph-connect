-- Migration: Create External Applications Table
-- Created: 2025-11-06
-- Purpose: Store external contractor applications for onboarding.
--
-- Changes:
--   1. Create application_status enum (idempotent)
--   2. Create public.applications table with status tracking and audit fields
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

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_email text NOT NULL,
  applicant_name text NOT NULL,
  status public.application_status NOT NULL DEFAULT 'pending',
  application_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz DEFAULT NULL,
  reviewed_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_status
  ON public.applications(status);

CREATE INDEX IF NOT EXISTS idx_applications_submitted_at
  ON public.applications(submitted_at);

ALTER TABLE public.applications
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read applications"
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage applications"
  ON public.applications
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
