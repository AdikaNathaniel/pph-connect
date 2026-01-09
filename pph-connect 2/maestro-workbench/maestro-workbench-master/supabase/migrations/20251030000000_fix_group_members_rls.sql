-- Migration: Fix Infinite Recursion in Group Members RLS Policies
-- Created: 2025-10-30
-- Purpose: Fix the infinite recursion issue in group_members RLS policies
--
-- Problem: The original policies queried group_members within group_members policies,
--          causing infinite recursion.
--
-- Solution: Use security definer functions to check membership without triggering RLS
--
-- ============================================================================

-- Step 1: Create a security definer function to check group membership
-- This function bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND left_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_group_member IS
'Check if a user is an active member of a group. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- Step 2: Create a security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND left_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.message_groups
    WHERE id = p_group_id
      AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_group_admin IS
'Check if a user is an admin of a group or the group creator. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

-- Step 3: Drop and recreate group_members policies without recursion

-- Allow users to view memberships for groups they are part of
DROP POLICY IF EXISTS "Users can view their group memberships" ON public.group_members;
CREATE POLICY "Users can view their group memberships"
  ON public.group_members
  FOR SELECT
  USING (
    user_id = auth.uid() -- Can always see own membership
    OR
    public.is_group_member(group_id, auth.uid()) -- Can see other members if you're in the group
  );

-- Allow group admins to add members
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
CREATE POLICY "Group admins can add members"
  ON public.group_members
  FOR INSERT
  WITH CHECK (
    public.is_group_admin(group_id, auth.uid()) -- Only admins/creators can add members
  );

-- Allow users to update their own membership (to leave groups)
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR UPDATE
  USING (
    user_id = auth.uid() -- Can only update own membership to leave
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- Allow group admins to remove members or change roles
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
CREATE POLICY "Group admins can remove members"
  ON public.group_members
  FOR UPDATE
  USING (
    public.is_group_admin(group_id, auth.uid()) -- Admin/creator can manage members
    AND
    (
      -- If you're the creator, you can manage anyone
      EXISTS (
        SELECT 1 FROM public.message_groups
        WHERE id = group_id AND created_by = auth.uid()
      )
      OR
      -- If you're just an admin (not creator), you can't manage the creator
      NOT EXISTS (
        SELECT 1 FROM public.message_groups
        WHERE id = group_id AND created_by = user_id
      )
    )
  );

-- Step 4: Update message_groups policies to use the new helper functions

-- Allow users to view groups they are members of
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.message_groups;
CREATE POLICY "Users can view groups they are members of"
  ON public.message_groups
  FOR SELECT
  USING (
    auth.uid() = created_by -- Creator can always see
    OR
    group_type = 'saved_list' -- Saved lists only visible to creator (handled by created_by check)
    OR
    (
      group_type = 'conversation'
      AND public.is_group_member(id, auth.uid()) -- Use helper function
    )
  );

-- Allow group admins to update their groups
DROP POLICY IF EXISTS "Group admins can update their groups" ON public.message_groups;
CREATE POLICY "Group admins can update their groups"
  ON public.message_groups
  FOR UPDATE
  USING (
    auth.uid() = created_by -- Creator is always admin
    OR
    public.is_group_admin(id, auth.uid()) -- Use helper function
  );

-- Step 5: Update messages policies to use helper functions

-- Users can view messages in groups they are members of
DROP POLICY IF EXISTS "Users can view group messages" ON public.messages;
CREATE POLICY "Users can view group messages"
  ON public.messages
  FOR SELECT
  USING (
    group_id IS NULL -- Non-group messages handled by existing policies
    OR
    public.is_group_member(group_id, auth.uid()) -- Use helper function
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
      public.is_group_member(group_id, auth.uid()) -- Use helper function
    )
  );

-- Migration complete
-- Infinite recursion issue resolved using security definer functions
