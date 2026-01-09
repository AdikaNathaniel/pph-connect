-- Migration: Create Worker Accounts Table
-- Created: 2025-11-06
-- Purpose: Track platform accounts for workers with historical continuity and enforcement of single current account per platform.
--
-- Changes:
--   1. Create platform_type and worker_account_status enums (idempotent)
--   2. Create public.worker_accounts table with audit fields
--
-- ============================================================================

-- Create platform_type enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_type') THEN
        CREATE TYPE public.platform_type AS ENUM (
          'DataCompute',
          'Maestro',
          'Other'
        );
    END IF;
END $$;

-- Create worker_account_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_account_status') THEN
        CREATE TYPE public.worker_account_status AS ENUM (
          'active',
          'inactive',
          'replaced'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.worker_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  worker_account_email text NOT NULL,
  worker_account_id text NOT NULL,
  platform_type public.platform_type NOT NULL,
  status public.worker_account_status NOT NULL DEFAULT 'active',
  is_current boolean NOT NULL DEFAULT false,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz DEFAULT NULL,
  deactivation_reason text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.workers(id) ON DELETE SET NULL
);

-- Create partial unique index to enforce only one current account per worker+platform
-- Note: PostgreSQL doesn't support WHERE clauses in ALTER TABLE ADD CONSTRAINT UNIQUE
-- so we use a partial unique index instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_accounts_current_unique
  ON public.worker_accounts(worker_id, platform_type)
  WHERE is_current = true;

ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_active_current_check
    CHECK (status <> 'active' OR is_current = true);

ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_deactivated_at_check
    CHECK (deactivated_at IS NULL OR status <> 'active');

CREATE INDEX IF NOT EXISTS idx_worker_accounts_worker
  ON public.worker_accounts(worker_id);

CREATE INDEX IF NOT EXISTS idx_worker_accounts_current
  ON public.worker_accounts(worker_id)
  WHERE is_current = true;

ALTER TABLE public.worker_accounts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read worker accounts"
  ON public.worker_accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage worker accounts"
  ON public.worker_accounts
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
