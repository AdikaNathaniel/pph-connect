-- Comprehensive test for the claim_next_available_question function
-- Run this after applying the migration to verify everything works

-- Test Setup: Use your actual IDs
\set project_id '28b56d27-0748-4f66-9b1a-8a5971558183'
\set worker_id '240360d7-7ff3-498f-be68-72f0a3738148'

BEGIN;

-- ============================================================================
-- TEST 1: Clean State - First Claim
-- ============================================================================
SELECT '=== TEST 1: Clean State - First Claim ===' as test;

-- Ensure clean state
UPDATE public.tasks
SET status = 'pending', assigned_to = NULL, assigned_at = NULL
WHERE assigned_to = :'worker_id';

-- Attempt to claim
SELECT 
  'Claiming first task...' as action,
  COUNT(*) as questions_returned
FROM claim_next_available_question(:'project_id'::uuid, :'worker_id'::uuid);

-- Verify task was created
SELECT 
  'Verification: Task created' as check,
  COUNT(*) as active_reservations,
  MAX(assigned_at) as assigned_time
FROM tasks
WHERE assigned_to = :'worker_id'::uuid
  AND status IN ('assigned', 'in_progress');

-- ============================================================================
-- TEST 2: Resume Existing Reservation
-- ============================================================================
SELECT '=== TEST 2: Resume Existing Reservation ===' as test;

-- Claim again (should return same task)
SELECT 
  'Claiming again (should resume)...' as action,
  COUNT(*) as questions_returned
FROM claim_next_available_question(:'project_id'::uuid, :'worker_id'::uuid);

-- Verify only one task exists
SELECT 
  'Verification: Still only one task' as check,
  COUNT(*) as active_reservations
FROM tasks
WHERE assigned_to = :'worker_id'::uuid
  AND status IN ('assigned', 'in_progress');

-- ============================================================================
-- TEST 3: Expired Reservation Cleanup
-- ============================================================================
SELECT '=== TEST 3: Expired Reservation Cleanup ===' as test;

-- Manually expire the reservation
UPDATE tasks
SET assigned_at = NOW() - INTERVAL '2 hours'
WHERE assigned_to = :'worker_id'::uuid
  AND status IN ('assigned', 'in_progress');

-- Claim should clean up and create new
SELECT 
  'Claiming after expiry...' as action,
  COUNT(*) as questions_returned
FROM claim_next_available_question(:'project_id'::uuid, :'worker_id'::uuid);

-- Verify old task was cleaned up and new one created
SELECT 
  'Verification: Fresh reservation' as check,
  COUNT(*) as active_reservations,
  MAX(assigned_at) > NOW() - INTERVAL '5 minutes' as is_recent
FROM tasks
WHERE assigned_to = :'worker_id'::uuid
  AND status IN ('assigned', 'in_progress');

-- ============================================================================
-- TEST 4: No Available Questions
-- ============================================================================
SELECT '=== TEST 4: No Available Questions ===' as test;

-- Mark all questions as answered
UPDATE questions
SET is_answered = TRUE
WHERE project_id = :'project_id'::uuid;

-- Release current reservation
UPDATE tasks
SET status = 'pending', assigned_to = NULL, assigned_at = NULL
WHERE assigned_to = :'worker_id'::uuid;

-- Claim should return empty
SELECT 
  'Claiming when no work available...' as action,
  COUNT(*) as questions_returned
FROM claim_next_available_question(:'project_id'::uuid, :'worker_id'::uuid);

-- Verify no reservation was created
SELECT 
  'Verification: No reservation created' as check,
  COUNT(*) as active_reservations
FROM tasks
WHERE assigned_to = :'worker_id'::uuid
  AND status IN ('assigned', 'in_progress');

-- Restore questions for next tests
UPDATE questions
SET is_answered = FALSE
WHERE project_id = :'project_id'::uuid;

-- ============================================================================
-- TEST 5: Cross-Project Enforcement
-- ============================================================================
SELECT '=== TEST 5: Cross-Project Enforcement ===' as test;

-- Create a reservation in a different project (simulate)
-- First, get another project ID
DO $$
DECLARE
  other_project_id UUID;
  test_question_id UUID;
BEGIN
  -- Find a different project
  SELECT id INTO other_project_id
  FROM projects
  WHERE id != '28b56d27-0748-4f66-9b1a-8a5971558183'::uuid
  LIMIT 1;

  IF other_project_id IS NOT NULL THEN
    -- Get a question from that project
    SELECT id INTO test_question_id
    FROM questions
    WHERE project_id = other_project_id
    LIMIT 1;

    IF test_question_id IS NOT NULL THEN
      -- Create a reservation in the other project
      INSERT INTO tasks (
        project_id, question_id, row_index, data, status, assigned_to, assigned_at
      ) VALUES (
        other_project_id, test_question_id, 1, '{}'::jsonb, 
        'assigned', '240360d7-7ff3-498f-be68-72f0a3738148'::uuid, NOW()
      )
      ON CONFLICT DO NOTHING;

      RAISE NOTICE 'Created reservation in different project: %', other_project_id;
    END IF;
  END IF;
END $$;

-- Try to claim from original project (should return empty due to cross-project enforcement)
SELECT 
  'Claiming while having reservation elsewhere...' as action,
  COUNT(*) as questions_returned
FROM claim_next_available_question(:'project_id'::uuid, :'worker_id'::uuid);

-- ============================================================================
-- CLEANUP
-- ============================================================================
SELECT '=== CLEANUP ===' as test;

-- Clean up all test reservations
UPDATE tasks
SET status = 'pending', assigned_to = NULL, assigned_at = NULL
WHERE assigned_to = :'worker_id'::uuid;

SELECT 'All tests complete!' as result;

ROLLBACK; -- Don't commit test changes

-- ============================================================================
-- FINAL VERIFICATION (Run this separately to see actual state)
-- ============================================================================
-- Uncomment and run separately to see the actual state:

/*
SELECT 
  'Current Active Reservations' as info,
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
*/

