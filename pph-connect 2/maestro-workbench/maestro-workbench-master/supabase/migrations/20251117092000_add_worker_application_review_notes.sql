-- Migration: Add review notes to worker applications
-- Created: 2025-11-17
-- Purpose: Persist manager-provided rejection notes for worker applications without overwriting cover messages.

ALTER TABLE IF EXISTS public.worker_applications
  ADD COLUMN IF NOT EXISTS review_notes text;
