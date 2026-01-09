-- Add project instructions to projects table
ALTER TABLE projects ADD COLUMN instructions TEXT;

-- Create table for logging task answers and metadata
CREATE TABLE task_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  answer_data JSONB NOT NULL DEFAULT '{}',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_time TIMESTAMP WITH TIME ZONE NOT NULL,
  aht_seconds INTEGER NOT NULL, -- Average Handle Time in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for task answers
CREATE POLICY "Root and managers can view all answers" 
ON task_answers 
FOR SELECT 
USING (is_root_or_manager(auth.uid()));

CREATE POLICY "Workers can view their own answers" 
ON task_answers 
FOR SELECT 
USING (worker_id = auth.uid());

CREATE POLICY "Workers can insert their own answers" 
ON task_answers 
FOR INSERT 
WITH CHECK (worker_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_task_answers_task_id ON task_answers(task_id);
CREATE INDEX idx_task_answers_worker_id ON task_answers(worker_id);
CREATE INDEX idx_task_answers_project_id ON task_answers(project_id);
CREATE INDEX idx_task_answers_created_at ON task_answers(created_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_task_answers_updated_at
BEFORE UPDATE ON task_answers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();