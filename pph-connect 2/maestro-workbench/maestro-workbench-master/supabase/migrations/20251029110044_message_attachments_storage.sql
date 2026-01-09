-- Migration: 005 - Message Attachments Storage Bucket
-- Created: 2025-10-29
-- Purpose: Create Supabase Storage bucket for message attachments with appropriate policies.
--          Supports images, PDFs, and common document formats up to 10MB per file.
--
-- Changes:
--   1. Create 'message-attachments' storage bucket (private)
--   2. Set file size limit to 10MB
--   3. Restrict allowed MIME types to safe formats
--   4. Create RLS policies for storage bucket
--
-- Rollback:
--   DELETE FROM storage.buckets WHERE id = 'message-attachments';
--   -- Note: This will also remove all files in the bucket
--
-- Impact: NONE - New storage bucket, no dependencies
--   - No modifications to existing buckets
--   - No modifications to existing files
--
-- ============================================================================

-- ============================================================================
-- STEP 1: Create storage bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,  -- Private bucket (not publicly accessible)
  10485760,  -- 10MB file size limit (10 * 1024 * 1024 bytes)
  ARRAY[
    -- Image formats
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',

    -- Document formats
    'application/pdf',

    -- Microsoft Office formats
    'application/msword',  -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
    'application/vnd.ms-excel',  -- .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
    'application/vnd.ms-powerpoint',  -- .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',  -- .pptx

    -- Plain text
    'text/plain',
    'text/csv',

    -- Archives (if needed)
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects for this bucket
-- ============================================================================

-- Note: RLS on storage.objects is already enabled by default in Supabase
-- We just need to create policies specific to our bucket

-- ============================================================================
-- STEP 3: Create RLS policies for storage bucket
-- ============================================================================

-- Policy 1: Authenticated users can upload attachments to their own folder
-- Files should be uploaded to path: {user_id}/{timestamp}_{filename}
CREATE POLICY "Authenticated users upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 2: Users can view their own uploaded attachments
CREATE POLICY "Users view own attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: Recipients can view attachments from messages sent to them
-- This checks if the file path matches a message attachment they're allowed to see
CREATE POLICY "Recipients view message attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.messages m
      INNER JOIN public.message_recipients mr ON m.id = mr.message_id
      WHERE mr.recipient_id = auth.uid()
      AND mr.deleted_at IS NULL
      AND m.attachments::text LIKE '%' || storage.objects.name || '%'
    )
  );

-- Policy 4: Admins can view all attachments in the bucket
CREATE POLICY "Admins view all attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND public.is_root_or_manager(auth.uid())
  );

-- Policy 5: Users can delete their own attachments (within 1 hour of upload)
-- This allows users to remove attachments if they made a mistake during compose
CREATE POLICY "Users delete own recent attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND created_at > (now() - interval '1 hour')
  );

-- ============================================================================
-- STEP 4: Documentation
-- ============================================================================

-- Storage bucket 'message-attachments' configuration:
-- - File size limit: 10MB (10485760 bytes)
-- - Access: Private (authenticated users only)
-- - Allowed types: Images, PDFs, Office documents, plain text, archives

-- ============================================================================
-- Migration complete
-- Storage bucket 'message-attachments' created with:
--   - Private access (public = false)
--   - 10MB file size limit
--   - Restricted MIME types (images, PDFs, Office docs)
--   - 5 RLS policies for secure access control
-- Next: Run migration 006 to create permission helper functions
-- ============================================================================
