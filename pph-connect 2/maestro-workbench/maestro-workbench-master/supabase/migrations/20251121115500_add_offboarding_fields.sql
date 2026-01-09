-- Migration: Add Offboarding Fields to Workers Table
-- Created: 2025-11-21
-- Purpose: Store offboarding metadata and rehire eligibility flags.

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS termination_reason text,
  ADD COLUMN IF NOT EXISTS termination_notes text,
  ADD COLUMN IF NOT EXISTS rehire_eligible boolean DEFAULT true;
