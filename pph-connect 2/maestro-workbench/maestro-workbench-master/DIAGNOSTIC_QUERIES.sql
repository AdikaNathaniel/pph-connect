-- Diagnostic queries to check the state of tasks and reservations

-- 1. Check for any stuck reservations
SELECT 
  t.id,
  t.project_id,
  t.question_id,
  t.status,
  t.assigned_to,
  t.assigned_at,
  p.email as worker_email,
  proj.name as project_name,
  EXTRACT(EPOCH FROM (NOW() - t.assigned_at))/60 as minutes_since_assigned
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
LEFT JOIN projects proj ON t.project_id = proj.id
WHERE t.status IN ('assigned', 'in_progress')
  AND t.assigned_to IS NOT NULL
ORDER BY t.assigned_at DESC;

-- 2. Check available questions for a specific project
SELECT 
  q.id,
  q.question_id,
  q.row_index,
  q.is_answered,
  q.completed_replications,
  q.required_replications,
  (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.question_id = q.id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= NOW() - INTERVAL '60 minutes'
  ) as active_reservations
FROM questions q
WHERE q.project_id = '28b56d27-0748-4f66-9b1a-8a5971558183'
  AND q.is_answered = FALSE
  AND q.completed_replications < q.required_replications
ORDER BY q.row_index;

-- 3. Check the unique index on tasks
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tasks'
  AND indexname = 'idx_tasks_one_active_reservation';

-- 4. Test the claim function for the specific worker
SELECT * FROM claim_next_available_question(
  '28b56d27-0748-4f66-9b1a-8a5971558183'::uuid,
  '240360d7-7ff3-498f-be68-72f0a3738148'::uuid
);

-- 5. Check if there are any tasks for this worker
SELECT 
  t.*,
  q.question_id
FROM tasks t
LEFT JOIN questions q ON t.question_id = q.id
WHERE t.assigned_to = '240360d7-7ff3-498f-be68-72f0a3738148'
ORDER BY t.assigned_at DESC
LIMIT 10;

