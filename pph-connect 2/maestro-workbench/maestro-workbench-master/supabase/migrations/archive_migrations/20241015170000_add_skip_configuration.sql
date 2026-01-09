-- Add skip configuration to projects and answers tables
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS enable_skip_button BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS skip_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.enable_skip_button IS 'Whether workers can skip tasks for this project.';
COMMENT ON COLUMN public.projects.skip_reasons IS 'List of manager-defined skip reasons presented to workers.';

ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS skipped BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.answers
ADD COLUMN IF NOT EXISTS skip_reason TEXT;

COMMENT ON COLUMN public.answers.skipped IS 'Indicates if this answer represents a skipped task submission.';
COMMENT ON COLUMN public.answers.skip_reason IS 'Optional reason selected when the task was skipped.';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_answers_skipped ON public.answers(skipped) WHERE skipped = true;
CREATE INDEX IF NOT EXISTS idx_projects_enable_skip ON public.projects(enable_skip_button) WHERE enable_skip_button = true;
