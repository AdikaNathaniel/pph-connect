-- Migration: Add appeal metadata columns to auto_removals
-- Created: 2025-11-21
-- Purpose: Store worker appeal submissions and manager decisions tied to automated removals.

ALTER TABLE public.auto_removals
  ADD COLUMN IF NOT EXISTS appeal_message text,
  ADD COLUMN IF NOT EXISTS appeal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_reviewed_by uuid REFERENCES public.workers(id),
  ADD COLUMN IF NOT EXISTS appeal_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_decision_notes text;

-- Ensure existing rows without appeal info remain pending with no reviewer metadata.
UPDATE public.auto_removals
SET appeal_status = COALESCE(appeal_status, 'pending');
