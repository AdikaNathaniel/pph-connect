-- Manual cleanup script for stuck task reservations
-- Run this if you encounter issues with stuck reservations
-- Safe to run multiple times

BEGIN;

-- Show current stuck reservations before cleanup
SELECT 
  'BEFORE CLEANUP' as status,
  COUNT(*) as stuck_count,
  COUNT(DISTINCT assigned_to) as affected_workers
FROM tasks
WHERE status IN ('assigned', 'in_progress')
  AND assigned_to IS NOT NULL
  AND (
    assigned_at IS NULL 
    OR assigned_at < NOW() - INTERVAL '1 hour'
  );

-- Clean up stuck reservations
UPDATE public.tasks
SET status = 'pending',
    assigned_to = NULL,
    assigned_at = NULL,
    updated_at = NOW()
WHERE status IN ('assigned', 'in_progress')
  AND assigned_to IS NOT NULL
  AND (
    assigned_at IS NULL 
    OR assigned_at < NOW() - INTERVAL '1 hour'
  );

-- Show results after cleanup
SELECT 
  'AFTER CLEANUP' as status,
  COUNT(*) as stuck_count,
  COUNT(DISTINCT assigned_to) as affected_workers
FROM tasks
WHERE status IN ('assigned', 'in_progress')
  AND assigned_to IS NOT NULL
  AND (
    assigned_at IS NULL 
    OR assigned_at < NOW() - INTERVAL '1 hour'
  );

-- Show current active reservations (should be valid ones only)
SELECT 
  t.id,
  t.project_id,
  proj.name as project_name,
  t.assigned_to,
  p.email as worker_email,
  t.status,
  t.assigned_at,
  EXTRACT(EPOCH FROM (NOW() - t.assigned_at))/60 as minutes_active
FROM tasks t
LEFT JOIN profiles p ON t.assigned_to = p.id
LEFT JOIN projects proj ON t.project_id = proj.id
WHERE t.status IN ('assigned', 'in_progress')
  AND t.assigned_to IS NOT NULL
ORDER BY t.assigned_at DESC;

COMMIT;

