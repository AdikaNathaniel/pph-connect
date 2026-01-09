-- Migration: Add Broadcast Messaging Support
-- Created: 2025-11-06
-- Purpose: Enable broadcast deliveries with explicit delivery types and run tracking.
--
-- Changes:
--   1. Create message_delivery_type enum and add delivery_type column to messages
--   2. Create message_broadcast_status enum
--   3. Create message_broadcast_runs table with indexes and RLS policies
--
-- ============================================================================#

-- Create message_delivery_type enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_delivery_type') THEN
        CREATE TYPE public.message_delivery_type AS ENUM (
          'direct',
          'broadcast'
        );
    END IF;
END $$;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivery_type public.message_delivery_type NOT NULL DEFAULT 'direct';

-- Create message_broadcast_status enum (safe version with existence check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_broadcast_status') THEN
        CREATE TYPE public.message_broadcast_status AS ENUM (
          'pending',
          'processing',
          'completed',
          'failed'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.message_broadcast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  audience_target_id uuid REFERENCES public.message_audience_targets(id) ON DELETE SET NULL,
  status public.message_broadcast_status NOT NULL DEFAULT 'pending',
  summary text,
  run_by uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_broadcast_runs_thread
  ON public.message_broadcast_runs(thread_id);

CREATE INDEX IF NOT EXISTS idx_message_broadcast_runs_status
  ON public.message_broadcast_runs(status);

ALTER TABLE public.message_broadcast_runs
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read broadcast runs"
  ON public.message_broadcast_runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage broadcast runs"
  ON public.message_broadcast_runs
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
