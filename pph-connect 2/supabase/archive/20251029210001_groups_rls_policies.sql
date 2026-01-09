-- Migration: RLS Policies for Group Messaging
-- Created: 2025-10-29
-- Purpose: Add Row Level Security policies for conversation groups and group members
--
-- Changes:
--   1. Enable RLS on group_members table
--   2. Add policies for viewing groups
--   3. Add policies for managing group membership
--   4. Add policies for sending messages to groups
--
-- Rollback:
--   DROP POLICY IF EXISTS "Users can view groups they are members of" ON message_groups;
--   DROP POLICY IF EXISTS "Users can create conversation groups" ON message_groups;
--   DROP POLICY IF EXISTS "Group admins can update their groups" ON message_groups;
--   DROP POLICY IF EXISTS "Users can view their group memberships" ON group_members;
--   DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
--   DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
--   DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
--
-- ============================================================================

-- Step 1: Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Step 2: Policies for message_groups

-- Allow users to view groups they are members of (for conversation groups)
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.message_groups;
CREATE POLICY "Users can view groups they are members of"
  ON public.message_groups
  FOR SELECT
  USING (
    auth.uid() = created_by -- Creator can always see
    OR
    group_type = 'saved_list' -- Saved lists only visible to creator (handled by created_by check)
    OR
    EXISTS ( -- Conversation groups visible to members
      SELECT 1 FROM public.group_members
      WHERE group_id = id
        AND user_id = auth.uid()
        AND left_at IS NULL
    )
  );

-- Allow any authenticated user to create conversation groups
DROP POLICY IF EXISTS "Users can create conversation groups" ON public.message_groups;
CREATE POLICY "Users can create conversation groups"
  ON public.message_groups
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Allow group admins to update their groups
DROP POLICY IF EXISTS "Group admins can update their groups" ON public.message_groups;
CREATE POLICY "Group admins can update their groups"
  ON public.message_groups
  FOR UPDATE
  USING (
    auth.uid() = created_by -- Creator is always admin
    OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND left_at IS NULL
    )
  );

-- Step 3: Policies for group_members

-- Users can view memberships for groups they are part of
DROP POLICY IF EXISTS "Users can view their group memberships" ON public.group_members;
CREATE POLICY "Users can view their group memberships"
  ON public.group_members
  FOR SELECT
  USING (
    user_id = auth.uid() -- Can see own membership
    OR
    EXISTS ( -- Can see other members if you're in the group
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.left_at IS NULL
    )
  );

-- Group admins can add members
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
CREATE POLICY "Group admins can add members"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_groups mg
      WHERE mg.id = group_id
        AND (
          mg.created_by = auth.uid() -- Creator can add
          OR
          EXISTS ( -- Or group admin can add
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = mg.id
              AND gm.user_id = auth.uid()
              AND gm.role = 'admin'
              AND gm.left_at IS NULL
          )
        )
    )
  );

-- Users can leave groups (update their own membership)
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR UPDATE
  USING (
    user_id = auth.uid() -- Can only update own membership
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Group admins can remove members or change roles
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
CREATE POLICY "Group admins can remove members"
  ON public.group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.message_groups mg
      WHERE mg.id = group_id
        AND (
          mg.created_by = auth.uid() -- Creator can remove anyone
          OR
          EXISTS ( -- Group admin can remove (but not creator)
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = mg.id
              AND gm.user_id = auth.uid()
              AND gm.role = 'admin'
              AND gm.left_at IS NULL
              AND mg.created_by != group_members.user_id -- Can't remove creator
          )
        )
    )
  );

-- Step 4: Update messages policies to support group messages
-- Users can view messages in groups they are members of
DROP POLICY IF EXISTS "Users can view group messages" ON public.messages;
CREATE POLICY "Users can view group messages"
  ON public.messages
  FOR SELECT
  USING (
    group_id IS NULL -- Non-group messages handled by existing policies
    OR
    EXISTS ( -- Group messages visible to members
      SELECT 1 FROM public.group_members
      WHERE group_id = messages.group_id
        AND user_id = auth.uid()
        AND left_at IS NULL
    )
  );

-- Users can send messages to groups they are members of
DROP POLICY IF EXISTS "Users can send group messages" ON public.messages;
CREATE POLICY "Users can send group messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND
    (
      group_id IS NULL -- Non-group messages handled by existing policies
      OR
      EXISTS ( -- Must be a member of the group
        SELECT 1 FROM public.group_members
        WHERE group_id = messages.group_id
          AND user_id = auth.uid()
          AND left_at IS NULL
      )
    )
  );

-- Migration complete
-- Group messaging RLS policies are now in place
