-- Migration: Enhance Groups for WhatsApp-style Conversations
-- Created: 2025-10-29
-- Purpose: Transform message_groups from "saved recipient lists" into true conversation groups
--
-- Changes:
--   1. Add group metadata columns (description, avatar, etc.)
--   2. Create group_members table for tracking membership
--   3. Add group_id to messages table to support group messages
--   4. Create indexes for performance
--
-- Rollback:
--   DROP TABLE IF EXISTS group_members CASCADE;
--   ALTER TABLE messages DROP COLUMN IF EXISTS group_id;
--   ALTER TABLE message_groups DROP COLUMN IF EXISTS description;
--   ALTER TABLE message_groups DROP COLUMN IF EXISTS avatar_url;
--   ALTER TABLE message_groups DROP COLUMN IF EXISTS is_active;
--   ALTER TABLE message_groups DROP COLUMN IF EXISTS group_type;
--
-- ============================================================================

-- Step 1: Enhance message_groups table with additional metadata
ALTER TABLE public.message_groups
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'conversation'; -- 'conversation' or 'saved_list'

COMMENT ON COLUMN public.message_groups.description IS
'Optional description of the group purpose';

COMMENT ON COLUMN public.message_groups.avatar_url IS
'Optional URL to group avatar/icon';

COMMENT ON COLUMN public.message_groups.is_active IS
'Whether the group is active. Inactive groups are archived but not deleted';

COMMENT ON COLUMN public.message_groups.group_type IS
'Type of group: "conversation" for WhatsApp-style groups, "saved_list" for broadcast recipient lists';

-- Step 2: Create group_members table
-- Tracks individual membership in groups
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.message_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz, -- NULL = still in group, timestamp = when they left
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Each user can only be in a group once
  UNIQUE(group_id, user_id)
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id
  ON public.group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id
  ON public.group_members(user_id);

-- Index for active members (not left)
CREATE INDEX IF NOT EXISTS idx_group_members_active
  ON public.group_members(group_id, user_id)
  WHERE left_at IS NULL;

COMMENT ON TABLE public.group_members IS
'Tracks individual user membership in conversation groups. Supports roles (admin/member) and tracks when users join/leave.';

COMMENT ON COLUMN public.group_members.role IS
'Member role: "admin" can manage group, "member" is regular participant';

COMMENT ON COLUMN public.group_members.left_at IS
'Timestamp when user left the group. NULL = still active member';

-- Step 3: Add group_id to messages table
-- This allows messages to be sent to a group instead of individual recipients
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.message_groups(id) ON DELETE CASCADE;

-- Index for group messages
CREATE INDEX IF NOT EXISTS idx_messages_group_id
  ON public.messages(group_id);

COMMENT ON COLUMN public.messages.group_id IS
'Optional reference to a conversation group. If set, this message was sent to a group rather than individual recipients.';

-- Step 4: Create helper function to automatically add creator as group admin
CREATE OR REPLACE FUNCTION public.add_creator_to_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for conversation groups
  IF NEW.group_type = 'conversation' THEN
    -- Add the creator as an admin member
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add creator
DROP TRIGGER IF EXISTS trigger_add_creator_to_group ON public.message_groups;
CREATE TRIGGER trigger_add_creator_to_group
  AFTER INSERT ON public.message_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_to_group();

COMMENT ON FUNCTION public.add_creator_to_group IS
'Automatically adds the group creator as an admin member when a new conversation group is created';

-- Migration complete
-- Next: Update RLS policies to support group messaging
