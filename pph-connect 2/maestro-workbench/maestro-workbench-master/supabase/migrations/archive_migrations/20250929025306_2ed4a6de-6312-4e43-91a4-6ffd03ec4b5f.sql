-- Add due_date to projects for deadlines
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ NULL;