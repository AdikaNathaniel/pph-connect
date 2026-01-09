-- Migration: Fix Worker Accounts Audit Fields
-- Created: 2025-11-25
-- Purpose: Fix created_by/updated_by to reference auth.users instead of workers
--
-- Changes:
--   1. Drop existing foreign key constraints for audit fields
--   2. Add new foreign key constraints referencing auth.users
--
-- ============================================================================

-- Step 1: Drop the existing foreign key constraints
ALTER TABLE public.worker_accounts
  DROP CONSTRAINT IF EXISTS worker_accounts_created_by_fkey;

ALTER TABLE public.worker_accounts
  DROP CONSTRAINT IF EXISTS worker_accounts_updated_by_fkey;

-- Step 2: Add new foreign key constraints referencing auth.users
ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

ALTER TABLE public.worker_accounts
  ADD CONSTRAINT worker_accounts_updated_by_fkey
    FOREIGN KEY (updated_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.worker_accounts.created_by IS
  'UUID of the auth user who created this worker account record';

COMMENT ON COLUMN public.worker_accounts.updated_by IS
  'UUID of the auth user who last updated this worker account record';
