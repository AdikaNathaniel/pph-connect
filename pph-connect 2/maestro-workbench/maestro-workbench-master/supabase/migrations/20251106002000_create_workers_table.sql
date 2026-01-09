-- Migration: Create Workers Table
-- Created: 2025-11-06
-- Purpose: Introduce core worker identity table with enumerations and audit metadata.
--
-- Changes:
--   1. Create engagement_model and worker_status enums
--   2. Create public.workers table with required columns and defaults
--
-- ============================================================================

-- Create engagement_model enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_model') THEN
        CREATE TYPE public.engagement_model AS ENUM (
          'core',
          'upwork',
          'external',
          'internal'
        );
    END IF;
END $$;

-- Create worker_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
        CREATE TYPE public.worker_status AS ENUM (
          'pending',
          'active',
          'inactive',
          'terminated'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hr_id text NOT NULL,
  full_name text NOT NULL,
  engagement_model public.engagement_model NOT NULL,
  worker_role text DEFAULT NULL,
  email_personal text NOT NULL,
  email_pph text DEFAULT NULL,
  country_residence text NOT NULL,
  locale_primary text NOT NULL,
  locale_all text[] NOT NULL DEFAULT '{}',
  hire_date date NOT NULL,
  rtw_datetime timestamptz DEFAULT NULL,
  supervisor_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  termination_date date DEFAULT NULL,
  bgc_expiration_date date DEFAULT NULL,
  status public.worker_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  CONSTRAINT workers_hr_id_key UNIQUE (hr_id),
  CONSTRAINT workers_email_personal_key UNIQUE (email_personal),
  CONSTRAINT workers_email_pph_key UNIQUE (email_pph)
);

CREATE INDEX IF NOT EXISTS idx_workers_hr_id
  ON public.workers(hr_id);

CREATE INDEX IF NOT EXISTS idx_workers_status
  ON public.workers(status);

CREATE INDEX IF NOT EXISTS idx_workers_supervisor
  ON public.workers(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_workers_email
  ON public.workers(email_personal);

ALTER TABLE public.workers
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workers"
  ON public.workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage workers"
  ON public.workers
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

ALTER TABLE public.workers
  ADD CONSTRAINT workers_no_self_supervision_check
    CHECK (supervisor_id IS NULL OR supervisor_id <> id);

ALTER TABLE public.workers
  ADD CONSTRAINT workers_status_requirements_check
    CHECK (
      (status = 'pending' AND rtw_datetime IS NULL AND termination_date IS NULL)
      OR (status IN ('active', 'inactive') AND rtw_datetime IS NOT NULL AND termination_date IS NULL)
      OR (status = 'terminated' AND termination_date IS NOT NULL AND rtw_datetime IS NOT NULL)
    );
