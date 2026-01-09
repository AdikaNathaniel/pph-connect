-- Migration: Add removal_reason to worker_assignments
-- Created: 2025-11-06
-- Purpose: Capture optional reason provided when removing a worker from a project assignment.
--
-- ============================================================================

ALTER TABLE public.worker_assignments
  ADD COLUMN IF NOT EXISTS removal_reason text;

