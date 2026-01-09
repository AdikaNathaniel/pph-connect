-- Allow workers to hold multiple project assignments
ALTER TABLE public.project_assignments
DROP CONSTRAINT IF EXISTS project_assignments_worker_id_key;

ALTER TABLE public.project_assignments
ADD CONSTRAINT project_assignments_worker_project_unique
UNIQUE (worker_id, project_id);

