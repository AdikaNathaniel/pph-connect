-- Migration: 004 - Messaging RLS Policies
-- Created: 2025-10-29
-- Purpose: Enable Row Level Security and create comprehensive policies for messaging tables.
--          Ensures users can only access messages they're authorized to view based on role hierarchy.
--
-- Changes:
--   1. Enable RLS on all 4 messaging tables
--   2. Create policies for message_threads (4 policies)
--   3. Create policies for messages (6 policies)
--   4. Create policies for message_recipients (4 policies)
--   5. Create policies for message_groups (2 policies)
--
-- Total: 16 policies
--
-- Rollback:
--   -- Drop all policies and disable RLS
--   ALTER TABLE message_threads DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE message_recipients DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE message_groups DISABLE ROW LEVEL SECURITY;
--
-- Impact: SECURITY CRITICAL
--   - Restricts data access based on user roles and relationships
--   - Prevents unauthorized message access
--   - Enforces soft delete (prevents hard delete on messages)
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on all messaging tables
-- ============================================================================

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_groups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Message Threads Policies (4 policies)
-- ============================================================================

-- Policy 1: Admins (root/manager) can view all threads
CREATE POLICY "Admins view all threads"
  ON public.message_threads
  FOR SELECT
  TO authenticated
  USING (
    public.is_root_or_manager(auth.uid())
  );

-- Policy 2: Users can view threads they created
CREATE POLICY "Users view own threads"
  ON public.message_threads
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
  );

-- Policy 3: Recipients can view threads where they received messages
CREATE POLICY "Recipients view threads"
  ON public.message_threads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      INNER JOIN public.message_recipients mr ON m.id = mr.message_id
      WHERE m.thread_id = message_threads.id
      AND mr.recipient_id = auth.uid()
    )
  );

-- Policy 4: Authenticated users can create threads
CREATE POLICY "Authenticated users create threads"
  ON public.message_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- ============================================================================
-- STEP 3: Messages Policies (6 policies)
-- ============================================================================

-- Policy 1: Admins (root/manager) can view all messages
CREATE POLICY "Admins view all messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_root_or_manager(auth.uid())
  );

-- Policy 2: Users can view messages they sent
CREATE POLICY "Users view sent messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid()
  );

-- Policy 3: Recipients can view messages sent to them (non-deleted)
CREATE POLICY "Recipients view messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_recipients mr
      WHERE mr.message_id = messages.id
      AND mr.recipient_id = auth.uid()
      AND mr.deleted_at IS NULL
    )
  );

-- Policy 4: Authenticated users can send messages (insert)
CREATE POLICY "Authenticated users send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Policy 5: Prevent hard delete on messages (for audit trail)
-- This policy ensures messages are never deleted from the database
CREATE POLICY "Prevent hard delete"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (false);

-- Policy 6: Allow soft delete (update deleted_at timestamp)
CREATE POLICY "Allow soft delete"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: Message Recipients Policies (4 policies)
-- ============================================================================

-- Policy 1: Users can view their own recipient records
CREATE POLICY "Users view own recipient records"
  ON public.message_recipients
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()
  );

-- Policy 2: Admins can view all recipient records
CREATE POLICY "Admins view all recipients"
  ON public.message_recipients
  FOR SELECT
  TO authenticated
  USING (
    public.is_root_or_manager(auth.uid())
  );

-- Policy 3: Service role creates recipient records
-- Only the system (via edge functions) should insert recipient records
-- Regular users cannot directly create recipient records
CREATE POLICY "Service role creates recipients"
  ON public.message_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- This will be handled by edge functions using service role
    -- Regular authenticated users should not directly insert
    -- The edge function will bypass RLS with service role key
    false
  );

-- Policy 4: Users can update their own recipient records (mark as read, soft delete)
CREATE POLICY "Users update own recipient records"
  ON public.message_recipients
  FOR UPDATE
  TO authenticated
  USING (
    recipient_id = auth.uid()
  )
  WITH CHECK (
    recipient_id = auth.uid()
  );

-- ============================================================================
-- STEP 5: Message Groups Policies (2 policies)
-- ============================================================================

-- Policy 1: Users can manage their own message groups (all operations)
CREATE POLICY "Users manage own groups"
  ON public.message_groups
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Policy 2: Admins can view all message groups
CREATE POLICY "Admins view all groups"
  ON public.message_groups
  FOR SELECT
  TO authenticated
  USING (
    public.is_root_or_manager(auth.uid())
  );

-- ============================================================================
-- STEP 6: Add policy comments for documentation
-- ============================================================================

COMMENT ON POLICY "Admins view all threads" ON public.message_threads IS
'Allows root and manager roles to view all message threads for administrative oversight.';

COMMENT ON POLICY "Recipients view threads" ON public.message_threads IS
'Allows users to view threads where they are recipients of at least one message.';

COMMENT ON POLICY "Prevent hard delete" ON public.messages IS
'Critical security policy: Prevents hard deletion of messages to maintain audit trail and compliance.';

COMMENT ON POLICY "Service role creates recipients" ON public.message_recipients IS
'Recipient records are created exclusively by edge functions using service role key, not by regular users.';

-- ============================================================================
-- Migration complete
-- Total policies created: 16 (4 + 6 + 4 + 2)
-- Next: Run migration 005 to create storage bucket
-- ============================================================================
