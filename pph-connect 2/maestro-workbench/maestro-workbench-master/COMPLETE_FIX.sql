-- COMPLETE FIX: Run this entire script in Supabase SQL Editor
-- This fixes the missing question_id column that broke the claim system

-- ==================================================
-- STEP 1: Add the missing question_id column
-- ==================================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_question_id ON public.tasks(question_id);

-- ==================================================
-- STEP 2: Delete all existing broken tasks
-- ==================================================
-- Since existing tasks don't have question_id, they're invalid
DELETE FROM tasks WHERE question_id IS NULL;

-- ==================================================
-- STEP 3: Update the RPC function with 1-hour reservations
-- ==================================================
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
  reservation_threshold TIMESTAMPTZ;
BEGIN
  -- Define reservation threshold (1 hour ago)
  reservation_threshold := NOW() - INTERVAL '1 hour';
  
  -- Clean up expired reservations before claiming
  UPDATE tasks 
  SET status = 'pending', 
      assigned_to = NULL, 
      assigned_at = NULL
  WHERE status IN ('assigned', 'in_progress')
    AND assigned_at < reservation_threshold;
  
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
        AND t.assigned_at >= reservation_threshold
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

-- ==================================================
-- STEP 4: Test the fix
-- ==================================================
-- Test claiming a question for your project
SELECT * FROM claim_next_available_question(
  '2001ea35-ab83-4f1e-bc4f-ec2b40d20485'::UUID,
  '240360d7-7ff3-498f-be68-72f0a3738148'::UUID
);

-- Check if it worked
SELECT COUNT(*) as tasks_created FROM tasks 
WHERE project_id = '2001ea35-ab83-4f1e-bc4f-ec2b40d20485';

-- Check available questions
SELECT COUNT(*) as available_questions
FROM questions q
WHERE q.project_id = '2001ea35-ab83-4f1e-bc4f-ec2b40d20485'
  AND q.is_answered = false
  AND NOT EXISTS (
    SELECT 1 FROM tasks t 
    WHERE t.question_id = q.id 
    AND t.status = 'assigned'
  );
