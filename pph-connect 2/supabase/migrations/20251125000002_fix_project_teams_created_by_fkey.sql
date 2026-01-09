-- Migration: Fix Project Teams Created By Foreign Key
-- Created: 2025-11-25
-- Purpose: Change created_by to reference profiles instead of workers
--
-- The created_by column should reference the user who performed
-- the action (from profiles/auth.users), not a worker record.
--
-- ============================================================================

-- Drop existing foreign key constraint
ALTER TABLE public.project_teams
  DROP CONSTRAINT IF EXISTS project_teams_created_by_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE public.project_teams
  ADD CONSTRAINT project_teams_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;
