-- Add average handle time column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS average_handle_time_minutes INTEGER;

COMMENT ON COLUMN public.projects.average_handle_time_minutes IS 'Average handle time threshold in minutes. Null disables AHT warnings for the project.';
