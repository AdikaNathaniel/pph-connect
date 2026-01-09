-- Add missing question_id column to tasks table
-- This column should have been added when the question/answer system was introduced

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_question_id ON public.tasks(question_id);

-- Add comment
COMMENT ON COLUMN public.tasks.question_id IS 
  'Links task to the question it is answering. Added to fix missing foreign key.';
