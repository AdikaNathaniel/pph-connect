-- Add locale field to projects table
ALTER TABLE public.projects ADD COLUMN locale TEXT DEFAULT 'en_us';

-- Create tasks table to track individual task completions and timing
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed')),
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_time_seconds INTEGER, -- Track how long task took to complete
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks
CREATE POLICY "Root and managers can manage all tasks" 
ON public.tasks 
FOR ALL 
USING (is_root_or_manager(auth.uid()));

CREATE POLICY "Workers can view and update assigned tasks" 
ON public.tasks 
FOR ALL 
USING (assigned_to = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_completed_at ON public.tasks(completed_at) WHERE completed_at IS NOT NULL;

-- Add trigger for updating updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();