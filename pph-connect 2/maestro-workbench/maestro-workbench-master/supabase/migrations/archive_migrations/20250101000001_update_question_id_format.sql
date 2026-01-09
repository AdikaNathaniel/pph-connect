-- Update Question ID format to include plus signs
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

-- Update Answer ID format: [first 24 chars of question_id]+[project_name]+answer+[unique 24 chars]
CREATE OR REPLACE FUNCTION public.generate_answer_id(question_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  project_name TEXT;
  clean_name TEXT;
BEGIN
  -- Extract project name from question_id (format: prefix+project_name+suffix)
  project_name := split_part(question_id, '+', 2);
  
  -- Use first 24 characters of question_id as prefix
  prefix := substring(question_id from 1 for 24);
  
  -- Generate 24 character random string for suffix
  suffix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
  
  -- Clean project name (remove special chars, limit length)
  clean_name := regexp_replace(project_name, '[^a-zA-Z0-9]', '', 'g');
  clean_name := substring(clean_name from 1 for 50); -- Limit length
  
  RETURN prefix || '+' || clean_name || '+answer+' || suffix;
END;
$$;

-- Create RPC function to increment project completed tasks
CREATE OR REPLACE FUNCTION public.increment_project_completed_tasks(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE projects 
  SET completed_tasks = COALESCE(completed_tasks, 0) + 1 
  WHERE id = project_id;
END;
$$;

-- Create atomic RPC function to claim next available question
CREATE OR REPLACE FUNCTION public.claim_next_available_question(p_project_id UUID, p_worker_id UUID)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  question_id TEXT,
  row_index INTEGER,
  data JSONB,
  completed_replications INTEGER,
  required_replications INTEGER,
  is_answered BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  selected_question RECORD;
BEGIN
  -- Find and claim the next available question atomically
  SELECT q.* INTO selected_question
  FROM questions q
  WHERE q.project_id = p_project_id
    AND q.is_answered = false
    AND q.completed_replications < q.required_replications
    AND NOT EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.question_id = q.id 
        AND t.status IN ('assigned', 'in_progress')
    )
  ORDER BY q.row_index ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no question found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create a task record to claim this question
  INSERT INTO tasks (
    project_id,
    question_id,
    row_index,
    data,
    status,
    assigned_to,
    assigned_at
  ) VALUES (
    selected_question.project_id,
    selected_question.id,
    selected_question.row_index,
    selected_question.data,
    'assigned',
    p_worker_id,
    NOW()
  );
  
  -- Return the question data
  RETURN QUERY SELECT 
    selected_question.id,
    selected_question.project_id,
    selected_question.question_id,
    selected_question.row_index,
    selected_question.data,
    selected_question.completed_replications,
    selected_question.required_replications,
    selected_question.is_answered,
    selected_question.created_at;
END;
$$;
