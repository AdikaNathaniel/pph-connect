-- Migration: Adapt Messaging Tables to Workers
-- Created: 2025-11-06
-- Purpose: Update messaging foreign keys to reference public.workers instead of public.profiles.
--
-- Changes:
--   1. Update message_threads.created_by FK → workers
--   2. Update messages.sender_id FK → workers
--   3. Update message_recipients.recipient_id FK → workers
--   4. Update message_groups.created_by FK → workers
--   5. Update group_members.user_id FK → workers
--
-- ============================================================================#

-- message_threads.created_by → workers
ALTER TABLE public.message_threads
  DROP CONSTRAINT IF EXISTS message_threads_created_by_fkey,
  ADD CONSTRAINT message_threads_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.workers(id) ON DELETE CASCADE;

-- messages.sender_id → workers
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
  ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.workers(id) ON DELETE CASCADE;

-- message_recipients.recipient_id → workers
ALTER TABLE public.message_recipients
  DROP CONSTRAINT IF EXISTS message_recipients_recipient_id_fkey,
  ADD CONSTRAINT message_recipients_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES public.workers(id) ON DELETE CASCADE;

-- message_groups.created_by → workers
ALTER TABLE public.message_groups
  DROP CONSTRAINT IF EXISTS message_groups_created_by_fkey,
  ADD CONSTRAINT message_groups_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.workers(id) ON DELETE CASCADE;

-- group_members.user_id → workers
ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_user_id_fkey,
  ADD CONSTRAINT group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.workers(id) ON DELETE CASCADE;

-- Ensure trigger function still executes with new FK (no change required to function logic)
