# Claim Function Fix - Comprehensive Summary

## Problem Analysis

### Root Cause
The infinite error loop when claiming tasks was caused by **stuck task reservations** that weren't being properly cleaned up. When a worker tried to claim a new task, the system would:

1. Try to insert a new task reservation
2. Hit the unique constraint `idx_tasks_one_active_reservation` (which enforces one active reservation per worker)
3. The exception handler would try to find the existing reservation
4. But the existing reservation might be for a different question or expired
5. Return empty or error, causing the frontend to retry infinitely

### Contributing Factors

1. **Incomplete cleanup**: The previous version only cleaned up expired reservations for the specific project, not for the worker across all projects
2. **Race conditions**: Multiple rapid claims could create inconsistent state
3. **Exception handling**: The exception handler assumed the conflicting reservation was valid and current
4. **No cross-project enforcement**: Workers could theoretically have reservations in multiple projects

## The Fix

### Migration File: `20251018000001_robust_claim_function.sql`

This migration provides a comprehensive fix with these improvements:

#### 1. **Upfront Cleanup**
```sql
UPDATE public.tasks
SET status = 'pending', assigned_to = NULL, assigned_at = NULL
WHERE status IN ('assigned', 'in_progress')
  AND assigned_to IS NOT NULL
  AND (assigned_at IS NULL OR assigned_at < NOW() - INTERVAL '1 hour');
```
Cleans up ALL stuck reservations before recreating the function.

#### 2. **Worker-Centric Cleanup**
The new function cleans up expired reservations for the specific worker across ALL projects first:
```sql
UPDATE public.tasks
SET status = 'pending', assigned_to = NULL, assigned_at = NULL
WHERE assigned_to = p_worker_id
  AND status IN ('assigned', 'in_progress')
  AND (assigned_at IS NULL OR assigned_at < reservation_threshold);
```

#### 3. **Cross-Project Enforcement**
Ensures a worker can only have ONE active reservation across all projects:
```sql
SELECT t.* INTO existing_task
FROM public.tasks AS t
WHERE t.assigned_to = p_worker_id
  AND t.status IN ('assigned', 'in_progress')
  AND t.assigned_at >= reservation_threshold
LIMIT 1;

IF FOUND THEN
  RETURN; -- Don't allow claiming from a different project
END IF;
```

#### 4. **Simplified Insert Logic**
Since we've cleaned up proactively, we can use a simple INSERT without complex ON CONFLICT logic:
```sql
INSERT INTO public.tasks (...)
VALUES (...)
RETURNING id INTO new_task_id;
```

#### 5. **Robust Exception Handling**
If a unique violation still occurs (race condition), find and return the existing reservation:
```sql
EXCEPTION WHEN unique_violation THEN
  SELECT t.* INTO existing_task
  FROM public.tasks AS t
  WHERE t.assigned_to = p_worker_id
    AND t.status IN ('assigned', 'in_progress')
  ...
  RETURN QUERY SELECT q.* FROM questions q WHERE q.id = existing_task.question_id;
```

## Deployment Steps

### 1. Apply the Migration
Run this in Supabase SQL Editor:
```sql
-- Copy and paste contents of:
-- supabase/migrations/20251018000001_robust_claim_function.sql
```

### 2. Verify the Fix
Run diagnostic queries from `DIAGNOSTIC_QUERIES.sql`:

```sql
-- Check for stuck reservations (should return 0 rows)
SELECT * FROM tasks 
WHERE status IN ('assigned', 'in_progress')
  AND assigned_to IS NOT NULL
  AND assigned_at < NOW() - INTERVAL '1 hour';

-- Test the claim function
SELECT * FROM claim_next_available_question(
  '28b56d27-0748-4f66-9b1a-8a5971558183'::uuid,
  '240360d7-7ff3-498f-be68-72f0a3738148'::uuid
);
```

### 3. Test in the Application
1. Log in as a worker
2. Navigate to dashboard (should show correct task count)
3. Click "Launch Task" (should work without infinite loop)
4. Navigate back to dashboard (task should be released, count should be correct)

## Prevention Strategies

### 1. Monitoring
The function now includes comprehensive cleanup at every step, making it self-healing.

### 2. Unique Constraint
The `idx_tasks_one_active_reservation` index ensures database-level enforcement of one reservation per worker.

### 3. Frontend Improvements
The Workbench component already includes:
- `exitInProgressRef` to prevent re-claiming during navigation
- Proper cleanup on unmount
- Manual "Release & Refresh" button on dashboard

### 4. Future Enhancements
Consider implementing:
- Scheduled cleanup job for very old stuck tasks
- Monitoring dashboard for reservation health
- Alerts for repeated claim failures

## Testing Checklist

- [ ] Apply migration in Supabase SQL Editor
- [ ] Run diagnostic queries to verify no stuck reservations
- [ ] Test claim function directly in SQL
- [ ] Log in as worker and verify dashboard shows correct count
- [ ] Launch task successfully
- [ ] Navigate back to dashboard and verify count updates
- [ ] Test with multiple workers simultaneously
- [ ] Verify no infinite error loops

## Files Modified

1. **New Migration**: `supabase/migrations/20251018000001_robust_claim_function.sql`
   - Comprehensive fix with cleanup and robust logic

2. **Diagnostic Tools**: `DIAGNOSTIC_QUERIES.sql`
   - Queries to verify system state

3. **Test Script**: `TEST_CONSTRAINT_NAME.sql`
   - For debugging constraint names (optional)

## Rollback Plan

If issues occur, you can rollback to the previous version:

```sql
-- Restore previous function version
-- (Copy from supabase/migrations/20251016190000_update_claim_function.sql)
```

However, the new version is strictly better and should not require rollback.

## Key Improvements Over Previous Version

1. ✅ **Proactive cleanup**: Cleans up stuck reservations before attempting to claim
2. ✅ **Worker-centric**: Ensures worker has no active reservations anywhere
3. ✅ **Cross-project enforcement**: One reservation per worker across all projects
4. ✅ **Simpler logic**: Less complex exception handling
5. ✅ **Self-healing**: Automatically fixes stuck states on every call
6. ✅ **Race condition handling**: Robust exception handling for concurrent claims

## Expected Behavior After Fix

### Normal Flow
1. Worker clicks "Launch Task"
2. Function checks for existing reservations → none found
3. Function finds available question
4. Function creates reservation
5. Task loads in workbench

### Resume Flow
1. Worker clicks "Launch Task" (already has active reservation)
2. Function finds existing reservation
3. Returns existing question
4. Task resumes in workbench

### No Work Available
1. Worker clicks "Launch Task"
2. Function checks for available questions → none found
3. Returns empty result
4. Dashboard shows "No tasks available"

### Navigation Away
1. Worker navigates from workbench to dashboard
2. Frontend releases reservation via `release_worker_tasks` RPC
3. Dashboard refreshes and shows correct count
4. No re-claiming occurs due to `exitInProgressRef`

