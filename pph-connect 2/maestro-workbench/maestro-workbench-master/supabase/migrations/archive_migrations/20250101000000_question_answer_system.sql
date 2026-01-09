-- Add replications_per_question to projects table
ALTER TABLE public.projects ADD COLUMN replications_per_question INTEGER NOT NULL DEFAULT 1;

-- Create questions table to track each unique question/row
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- 24char+project_name+24char format
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}', -- All the read-only data from the sheet
  required_replications INTEGER NOT NULL DEFAULT 1,
  completed_replications INTEGER NOT NULL DEFAULT 0,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, question_id)
);

-- Create answers table to track each individual answer
CREATE TABLE public.answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  answer_id TEXT NOT NULL, -- 24char+question_id+24char format
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_data JSONB NOT NULL DEFAULT '{}', -- The writable fields data
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_time TIMESTAMP WITH TIME ZONE NOT NULL,
  aht_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(answer_id)
);

-- Enable RLS on new tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for questions
CREATE POLICY "Managers can view all questions" 
ON public.questions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('root', 'manager')
  )
);

CREATE POLICY "Workers can view assigned project questions" 
ON public.questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE worker_id = auth.uid() AND project_id = public.questions.project_id
  )
);

-- RLS policies for answers
CREATE POLICY "Managers can view all answers" 
ON public.answers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('root', 'manager')
  )
);

CREATE POLICY "Workers can view their own answers" 
ON public.answers FOR SELECT
USING (worker_id = auth.uid());

CREATE POLICY "Workers can insert their own answers" 
ON public.answers FOR INSERT
WITH CHECK (worker_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_questions_project_id ON public.questions(project_id);
CREATE INDEX idx_questions_question_id ON public.questions(question_id);
CREATE INDEX idx_questions_is_answered ON public.questions(is_answered);
CREATE INDEX idx_answers_question_id ON public.answers(question_id);
CREATE INDEX idx_answers_project_id ON public.answers(project_id);
CREATE INDEX idx_answers_worker_id ON public.answers(worker_id);
CREATE INDEX idx_answers_answer_id ON public.answers(answer_id);

-- Create function to generate Question ID (24char+project_name+24char)
CREATE OR REPLACE FUNCTION public.generate_question_id(project_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  clean_name TEXT;
BEGIN
  -- Generate 24 character random strings
  prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
  suffix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
  
  -- Clean project name (remove special chars, limit length)
  clean_name := regexp_replace(project_name, '[^a-zA-Z0-9]', '', 'g');
  clean_name := substring(clean_name from 1 for 50); -- Limit length
  
  RETURN prefix || '+' || clean_name || '+' || suffix;
END;
$$;

-- Create function to generate Answer ID (24char+question_id+24char)
CREATE OR REPLACE FUNCTION public.generate_answer_id(question_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
BEGIN
  -- Generate 24 character random strings
  prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
  suffix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
  
  RETURN prefix || '+' || question_id || '+' || suffix;
END;
$$;

-- Create function to update question completion status
CREATE OR REPLACE FUNCTION public.update_question_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the question's completion status
  UPDATE public.questions 
  SET 
    completed_replications = (
      SELECT COUNT(*) 
      FROM public.answers 
      WHERE question_id = NEW.question_id
    ),
    is_answered = (
      SELECT COUNT(*) >= required_replications
      FROM public.answers 
      WHERE question_id = NEW.question_id
    ),
    updated_at = now()
  WHERE id = NEW.question_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update question completion when answers are added
CREATE TRIGGER update_question_completion_trigger
  AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.update_question_completion();

-- Create function to get project completion stats
CREATE OR REPLACE FUNCTION public.get_project_completion_stats(project_uuid UUID)
RETURNS TABLE(
  total_questions INTEGER,
  answered_questions INTEGER,
  completion_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_questions,
    COUNT(*) FILTER (WHERE is_answered = true)::INTEGER as answered_questions,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE is_answered = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    END as completion_percentage
  FROM public.questions 
  WHERE project_id = project_uuid;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
