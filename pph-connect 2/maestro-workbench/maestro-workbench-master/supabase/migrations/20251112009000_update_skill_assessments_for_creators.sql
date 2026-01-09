-- Migration: Allow skill assessments metadata storage
-- Created: 2025-11-12
-- Purpose: Support assessment templates by allowing worker_id NULL and metadata JSON
-- ============================================================================

ALTER TABLE public.skill_assessments
  ALTER COLUMN worker_id DROP NOT NULL;

ALTER TABLE public.skill_assessments
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
