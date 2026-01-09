-- Migration: Add Read Tracking for Group Messages
-- Created: 2025-10-30
-- Purpose: Add last_read_at column to group_members to track when users last viewed each group
--
-- This allows us to calculate unread message counts for groups by comparing
-- message timestamps with the last_read_at timestamp
--
-- ============================================================================

-- Step 1: Add last_read_at column to group_members
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

COMMENT ON COLUMN public.group_members.last_read_at IS
'Timestamp when the user last viewed/read messages in this group. Used to calculate unread message count.';

-- Step 2: Initialize last_read_at to joined_at for existing members
-- This ensures existing group members start with a clean slate
UPDATE public.group_members
SET last_read_at = joined_at
WHERE last_read_at IS NULL;

-- Migration complete
-- Group read tracking is now available
