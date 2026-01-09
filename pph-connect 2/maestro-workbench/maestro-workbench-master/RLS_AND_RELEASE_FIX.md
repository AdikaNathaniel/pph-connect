# RLS and Task Release Fix - Complete Analysis

## Problems Identified

### 1. **RLS Policy Violation (42501 Error)**
**Error:** `new row violates row-level security policy for table "tasks"`

**Root Cause:**
The tasks table had an RLS policy:
```sql
CREATE POLICY "Workers can view and update assigned tasks" 
ON public.tasks 
FOR ALL 
USING (assigned_to = auth.uid());
```

This policy has a critical flaw: When a worker tries to release a task by setting `assigned_to = NULL`, the policy check fails because:
- The `USING` clause checks if `assigned_to = auth.uid()` (TRUE for their task)
- But there's no `WITH CHECK` clause
- By default, `WITH CHECK` uses the same condition as `USING`
- When updating to `assigned_to = NULL`, the check `NULL = auth.uid()` fails
- Result: **RLS violation**

### 2. **Task Not Released on Navigation**
**Problem:** When navigating from Workbench back to Dashboard, the task count doesn't update (shows 1 instead of 2).

**Root Causes:**
1. The Dashboard button in Workbench showed a toast confirmation AFTER releasing, requiring user to click "Go to Dashboard" in the toast
2. This was confusing - users expected immediate navigation
3. The task wasn't actually released before navigation

### 3. **Direct UPDATE Approach**
Both Dashboard and Workbench were using direct `UPDATE` queries on the tasks table:
```typescript
await supabase
  .from('tasks')
  .update({ status: 'pending', assigned_to: null, assigned_at: null })
  .eq('id', taskId);
```

This approach:
- Requires proper RLS policies
- Doesn't enforce business logic
- Can't handle edge cases
- Harder to maintain

## Solutions Implemented

### Migration: `20251018000002_fix_rls_and_release.sql`

#### Fix 1: Separate RLS Policies

Replaced the single overly-restrictive policy with two specific policies:

```sql
-- Workers can SELECT their own assigned tasks
CREATE POLICY "Workers can view their assigned tasks"
ON public.tasks
FOR SELECT
USING (assigned_to = auth.uid());

-- Workers can UPDATE their own assigned tasks (including releasing them)
CREATE POLICY "Workers can update their assigned tasks"
ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (
  -- Allow releasing (setting to NULL) or keeping assigned to self
  assigned_to IS NULL OR assigned_to = auth.uid()
);
```

**Key Improvement:** The `WITH CHECK` clause explicitly allows `assigned_to = NULL`, enabling workers to release their own tasks.

#### Fix 2: Improved `release_worker_tasks` Function

Enhanced the function to return detailed information:

```sql
CREATE OR REPLACE FUNCTION public.release_worker_tasks()
RETURNS TABLE(
  released_count INTEGER,
  released_task_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Returns count and IDs of released tasks
$$;
```

**Benefits:**
- Returns detailed information about what was released
- `SECURITY DEFINER` bypasses RLS
- Centralized business logic

#### Fix 3: New `release_task_by_id` Function

Created a dedicated function for releasing single tasks:

```sql
CREATE OR REPLACE FUNCTION public.release_task_by_id(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Releases a specific task if it belongs to the current user
-- Returns TRUE if successful, FALSE if task not found/not owned
$$;
```

**Benefits:**
- Type-safe (returns boolean)
- Validates ownership before releasing
- Bypasses RLS with `SECURITY DEFINER`
- Centralized error handling

### Frontend Changes

#### Dashboard.tsx
**Before:**
```typescript
const releaseTaskReservation = async (taskId: string, workerId: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'pending', assigned_to: null, assigned_at: null })
    .eq('id', taskId)
    .eq('assigned_to', workerId)
    .eq('status', 'assigned');
  if (error) throw error;
};
```

**After:**
```typescript
const releaseTaskReservation = async (taskId: string) => {
  const { data, error } = await supabase
    .rpc('release_task_by_id', { p_task_id: taskId });
  
  if (error) throw error;
  if (!data) {
    throw new Error('Task not found or already released');
  }
};
```

**Improvements:**
- Uses RPC function instead of direct UPDATE
- Simpler signature (no workerId needed)
- Better error handling
- Respects business logic

#### Workbench.tsx

**Change 1: Release Function**
Updated `releaseTaskReservation` to use the RPC function (same as Dashboard).

**Change 2: Dashboard Navigation**
**Before:**
```typescript
onClick={() => {
  if (currentTask) {
    exitInProgressRef.current = true;
    releaseCurrentTask({ suppressStateReset: true })
      .finally(() => {
        toast.warning('You will lose your current task reservation', {
          action: {
            label: 'Go to Dashboard',
            onClick: () => navigate('/w/dashboard')
          }
        });
      });
  } else {
    navigate('/w/dashboard');
  }
}}
```

**After:**
```typescript
onClick={async () => {
  if (currentTask) {
    exitInProgressRef.current = true;
    
    try {
      await releaseCurrentTask({ suppressStateReset: true });
      console.log('Task released successfully before navigation');
    } catch (error) {
      console.error('Failed to release reservation before dashboard navigation', error);
      logWorkerEvent('error', 'Failed to release task before navigation', 'workbench_navigation', {
        taskId: currentTask.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Navigate regardless of release success
    navigate('/w/dashboard');
  } else {
    navigate('/w/dashboard');
  }
}}
```

**Improvements:**
- Immediately releases and navigates (no toast confirmation)
- Logs errors for debugging
- Navigates even if release fails (better UX)
- Sets `exitInProgressRef` to prevent auto-claiming

#### types.ts
Added TypeScript definitions for new RPC functions:

```typescript
release_task_by_id: {
  Args: { p_task_id: string }
  Returns: boolean
}
release_worker_tasks: {
  Args: Record<PropertyKey, never>
  Returns: {
    released_count: number
    released_task_ids: string[]
  }[]
}
```

## Testing Checklist

### Test 1: Release from Dashboard
- [ ] Log in as worker
- [ ] Dashboard shows correct task count (e.g., 2)
- [ ] Click "Launch Task"
- [ ] Task loads in workbench
- [ ] Navigate back to dashboard
- [ ] Count should still show 2 (task was released)
- [ ] Click "Release & Refresh" button
- [ ] Should work without 42501 error
- [ ] Should show success toast

### Test 2: Navigation from Workbench
- [ ] Log in as worker
- [ ] Launch a task
- [ ] Click "Dashboard" button in footer
- [ ] Should navigate immediately (no toast confirmation)
- [ ] Dashboard should show correct count
- [ ] Check client logs - should show task was released

### Test 3: Multiple Tasks
- [ ] Have 3+ tasks available
- [ ] Launch task (count: 2 remaining)
- [ ] Navigate to dashboard (count: 3, task released)
- [ ] Launch task again (count: 2)
- [ ] Navigate to dashboard (count: 3)
- [ ] Verify no stuck reservations

### Test 4: Error Handling
- [ ] Launch task
- [ ] Manually delete task from database
- [ ] Try to release from dashboard
- [ ] Should show appropriate error message
- [ ] Should not crash application

## Deployment Steps

### Step 1: Apply SQL Migration
Copy and paste into Supabase SQL Editor:
```
supabase/migrations/20251018000002_fix_rls_and_release.sql
```

### Step 2: Verify Migration
Run these queries to verify:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks'
  AND schemaname = 'public';

-- Should show:
-- "Workers can view their assigned tasks" (SELECT)
-- "Workers can update their assigned tasks" (UPDATE with CHECK allowing NULL)

-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('release_task_by_id', 'release_worker_tasks');

-- Should return both functions
```

### Step 3: Deploy Frontend
The frontend changes are already in the codebase. Just ensure they're deployed.

### Step 4: Test
Follow the testing checklist above.

## Prevention Strategies

### 1. Always Use RPC Functions for State Changes
- ✅ Encapsulates business logic
- ✅ Bypasses RLS with SECURITY DEFINER
- ✅ Centralized error handling
- ✅ Easier to test and maintain

### 2. Separate RLS Policies by Operation
- Use specific policies for SELECT, INSERT, UPDATE, DELETE
- Always specify `WITH CHECK` for UPDATE policies
- Consider what the "after" state looks like, not just "before"

### 3. Test RLS Policies Thoroughly
```sql
-- Test as worker
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '<worker-uuid>';

-- Try to release task
UPDATE tasks
SET assigned_to = NULL
WHERE id = '<task-id>';

-- Should succeed with new policy
```

### 4. Logging and Monitoring
- Log all task state changes
- Monitor for 42501 errors
- Alert on stuck reservations

## Key Learnings

### RLS Policy Gotchas
1. **USING vs WITH CHECK**: `USING` checks the current row state, `WITH CHECK` checks the new row state
2. **NULL comparisons**: `NULL = anything` is always FALSE, including `NULL = auth.uid()`
3. **Default WITH CHECK**: If not specified, uses the same condition as `USING`

### Task Release Pattern
1. **Set exit flag first**: Prevents auto-claiming during navigation
2. **Release task**: Use RPC function, not direct UPDATE
3. **Navigate**: Even if release fails (better UX)
4. **Log errors**: For debugging and monitoring

### Function Design
1. **SECURITY DEFINER**: Use for functions that need to bypass RLS
2. **Return meaningful data**: Boolean for success/fail, or detailed info
3. **Validate ownership**: Check user owns the resource before modifying
4. **Handle edge cases**: Task already released, not found, etc.

## Files Modified

1. **`supabase/migrations/20251018000002_fix_rls_and_release.sql`** - New migration
2. **`src/pages/worker/Dashboard.tsx`** - Updated release function
3. **`src/pages/worker/Workbench.tsx`** - Updated release function and navigation
4. **`src/integrations/supabase/types.ts`** - Added RPC type definitions

## Rollback Plan

If issues occur:

```sql
-- Restore old RLS policy
DROP POLICY IF EXISTS "Workers can view their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Workers can update their assigned tasks" ON public.tasks;

CREATE POLICY "Workers can view and update assigned tasks" 
ON public.tasks 
FOR ALL 
USING (assigned_to = auth.uid());

-- Keep the new functions though - they're better
```

## Success Criteria

- ✅ No 42501 RLS errors when releasing tasks
- ✅ Task count updates correctly after navigation
- ✅ Dashboard "Release & Refresh" button works
- ✅ Workbench navigation immediately releases and navigates
- ✅ No stuck reservations
- ✅ Proper error logging for debugging

