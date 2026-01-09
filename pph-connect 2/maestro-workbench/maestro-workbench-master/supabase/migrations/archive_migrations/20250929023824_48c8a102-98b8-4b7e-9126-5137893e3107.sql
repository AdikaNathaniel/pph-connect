-- Add priority field to project_assignments table
ALTER TABLE public.project_assignments 
ADD COLUMN priority integer NOT NULL DEFAULT 50;

-- Add index for efficient priority-based queries
CREATE INDEX idx_project_assignments_worker_priority 
ON public.project_assignments(worker_id, priority ASC);

-- Add comment to clarify priority system
COMMENT ON COLUMN public.project_assignments.priority IS 'Priority level: 0 (highest) to 100 (lowest)';