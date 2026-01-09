-- Verification Queries for Task Completion Fix
-- Run these queries to verify the fix is working correctly

-- ============================================================================
-- BEFORE APPLYING MIGRATIONS (to understand current state)
-- ============================================================================

-- 1. Count stuck tasks (should be > 0 before fix)
SELECT COUNT(*) as stuck_tasks_count
FROM tasks t
WHERE t.status IN ('assigned', 'in_progress')
  AND EXISTS (
    SELECT 1 FROM answers a 
    WHERE a.question_id = t.question_id 
      AND a.worker_id = t.assigned_to
  );

-- 2. List stuck tasks with details
SELECT 
  t.id as task_id,
  p.name as project_name,
  t.status,
  t.assigned_at,
  a.completion_time,
  (a.completion_time IS NOT NULL) as has_answer
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN answers a ON a.question_id = t.question_id AND a.worker_id = t.assigned_to
WHERE t.status IN ('assigned', 'in_progress')
  AND a.id IS NOT NULL
ORDER BY t.assigned_at DESC;

-- ============================================================================
-- AFTER APPLYING MIGRATIONS (to verify fix worked)
-- ============================================================================

-- 3. Verify stuck tasks are cleaned (should be 0)
SELECT COUNT(*) as remaining_stuck_tasks
FROM tasks t
WHERE t.status IN ('assigned', 'in_progress')
  AND EXISTS (
    SELECT 1 FROM answers a 
    WHERE a.question_id = t.question_id 
      AND a.worker_id = t.assigned_to
  );

-- 4. Verify trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_complete_task_on_answer';

-- 5. Verify cleanup function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'cleanup_orphaned_task_reservations';

-- 6. Check specific worker's tasks (selseladost51@gmail.com)
SELECT 
  t.id,
  p.name as project_name,
  t.status,
  t.assigned_at,
  t.completed_at,
  q.is_answered,
  (a.id IS NOT NULL) as has_answer
FROM tasks t
JOIN projects p ON t.project_id = p.id
JOIN questions q ON t.question_id = q.id
LEFT JOIN answers a ON a.question_id = t.question_id AND a.worker_id = t.assigned_to
WHERE t.assigned_to = 'e7ad46e0-d914-4efa-8513-12d7ede8d86e'
ORDER BY t.created_at DESC;

-- 7. Count available questions for worker's projects
SELECT 
  p.name as project_name,
  COUNT(*) FILTER (WHERE q.is_answered = false AND q.completed_replications < q.required_replications) as available_questions,
  COUNT(*) FILTER (WHERE q.is_answered = true) as answered_questions,
  COUNT(*) as total_questions
FROM questions q
JOIN projects p ON q.project_id = p.id
WHERE p.id IN ('4b3d0d35-1b76-42f9-be4d-ac15e918ad55', 'bf19136d-6be5-4ddc-9974-9daae41b501e')
GROUP BY p.id, p.name;

-- ============================================================================
-- ONGOING MONITORING
-- ============================================================================

-- 8. Check for any current task inconsistencies
SELECT 
  'Tasks with completed_at but wrong status' as issue_type,
  COUNT(*) as count
FROM tasks
WHERE completed_at IS NOT NULL AND status != 'completed'
UNION ALL
SELECT 
  'Tasks with status=completed but no completed_at' as issue_type,
  COUNT(*) as count
FROM tasks
WHERE status = 'completed' AND completed_at IS NULL;

-- 9. Check task status distribution
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM tasks
GROUP BY status
ORDER BY status;

-- 10. Find any tasks assigned longer than reservation window
SELECT 
  t.id,
  p.name as project_name,
  t.status,
  t.assigned_at,
  p.reservation_time_limit_minutes,
  EXTRACT(EPOCH FROM (NOW() - t.assigned_at))/60 as minutes_assigned
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.status IN ('assigned', 'in_progress')
  AND t.assigned_at < NOW() - (p.reservation_time_limit_minutes || ' minutes')::INTERVAL
ORDER BY t.assigned_at;

-- ============================================================================
-- MANUAL CLEANUP (if needed)
-- ============================================================================

-- 11. Manually run cleanup function (safe to run anytime)
SELECT public.cleanup_orphaned_task_reservations() as cleaned_count;

-- 12. Check if cleanup helped
-- Re-run query #3 after cleanup to verify

-- ============================================================================
-- TEST SCENARIO: Submit an answer and verify task completes
-- ============================================================================

-- 13. Before submitting answer - check task status
-- Replace <task_id> with actual task ID
SELECT 
  id,
  status,
  completed_at,
  completion_time_seconds
FROM tasks
WHERE id = '<task_id>';

-- 14. After submitting answer - verify task was completed
-- Replace <task_id> with same task ID
-- Should show status='completed' with completed_at and completion_time_seconds filled
SELECT 
  id,
  status,
  completed_at,
  completion_time_seconds
FROM tasks
WHERE id = '<task_id>';

-- 15. Verify answer was created
-- Replace <question_id> and <worker_id> with actual values
SELECT 
  a.id,
  a.answer_id,
  a.completion_time,
  a.aht_seconds,
  t.status as task_status,
  t.completed_at as task_completed_at
FROM answers a
LEFT JOIN tasks t ON t.question_id = a.question_id AND t.assigned_to = a.worker_id
WHERE a.question_id = '<question_id>'
  AND a.worker_id = '<worker_id>'
ORDER BY a.completion_time DESC
LIMIT 1;

