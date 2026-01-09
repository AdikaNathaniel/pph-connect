-- Add instructions_pdf_url and instructions_google_docs_url columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS instructions_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS instructions_google_docs_url TEXT;

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for project-files bucket
-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project files" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');

-- Allow anyone to view files (since bucket is public)
CREATE POLICY "Anyone can view project files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-files');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');

