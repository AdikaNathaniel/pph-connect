-- Migration: 003 - Create Messaging Tables
-- Created: 2025-10-29
-- Purpose: Create core messaging tables: message_threads, messages, message_recipients, message_groups.
--          These tables support hierarchical internal messaging with soft delete and audit trail.
--
-- Changes:
--   1. Create message_threads table (conversation containers)
--   2. Create messages table (individual messages with soft delete)
--   3. Create message_recipients table (tracking who received/read messages)
--   4. Create message_groups table (saved recipient groups for broadcasting)
--   5. Add indexes for performance optimization
--
-- Rollback:
--   DROP TABLE IF EXISTS message_groups CASCADE;
--   DROP TABLE IF EXISTS message_recipients CASCADE;
--   DROP TABLE IF EXISTS messages CASCADE;
--   DROP TABLE IF EXISTS message_threads CASCADE;
--
-- Impact: NONE - New tables, no dependencies
--   - No modifications to existing tables
--   - No data modifications
--   - RLS will be enabled in next migration
--
-- ============================================================================

-- Step 1: Create message_threads table
-- A thread represents a conversation/message chain
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for threads created by a specific user
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by
  ON public.message_threads(created_by);

-- Step 2: Create messages table
-- Individual messages within a thread
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz, -- Soft delete timestamp (NULL = not deleted)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_thread_id
  ON public.messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_sent_at
  ON public.messages(sent_at DESC);

-- Step 3: Create message_recipients table
-- Tracks who received each message and when they read it
CREATE TABLE IF NOT EXISTS public.message_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz, -- NULL = unread, timestamp = when read
  deleted_at timestamptz, -- Soft delete for recipient's inbox (NULL = not deleted)
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure each recipient is only listed once per message
  UNIQUE(message_id, recipient_id)
);

-- Indexes for message_recipients table
CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient_id
  ON public.message_recipients(recipient_id);

CREATE INDEX IF NOT EXISTS idx_message_recipients_message_id
  ON public.message_recipients(message_id);

-- Index for efficient unread message queries
CREATE INDEX IF NOT EXISTS idx_message_recipients_unread
  ON public.message_recipients(recipient_id, read_at)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- Step 4: Create message_groups table
-- Saved groups of recipients for easy broadcasting
CREATE TABLE IF NOT EXISTS public.message_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[], -- Array of user IDs
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for groups created by a specific user
CREATE INDEX IF NOT EXISTS idx_message_groups_created_by
  ON public.message_groups(created_by);

-- Add table comments for documentation
COMMENT ON TABLE public.message_threads IS
'Message threads (conversations). Each thread has a subject and contains multiple messages.';

COMMENT ON TABLE public.messages IS
'Individual messages within threads. Supports soft delete (deleted_at) and attachments (JSONB array).';

COMMENT ON TABLE public.message_recipients IS
'Junction table tracking message recipients. Includes read_at timestamp for read receipts and deleted_at for soft delete from recipient inbox.';

COMMENT ON TABLE public.message_groups IS
'Saved recipient groups for easy message broadcasting. Created by managers/admins for frequently used distribution lists.';

COMMENT ON COLUMN public.messages.attachments IS
'JSONB array of attachment metadata. Each entry contains: {path: string, name: string, size: number, type: string}';

COMMENT ON COLUMN public.messages.deleted_at IS
'Soft delete timestamp. NULL = active message. Non-null = deleted (preserved for audit trail).';

COMMENT ON COLUMN public.message_recipients.read_at IS
'Read receipt timestamp. NULL = unread. Non-null = timestamp when recipient read the message.';

COMMENT ON COLUMN public.message_recipients.deleted_at IS
'Soft delete from recipient inbox. NULL = visible. Non-null = deleted from this recipient view.';

-- Migration complete
-- Next: Run migration 004 to add RLS policies
