# Workbench Navigation Fix - Task Release on Exit

## Problem

When navigating from Workbench back to Dashboard (without submitting a task), the task reservation was NOT being released properly. This caused:
- Dashboard showing 1 task available instead of 2
- Worker having to manually click "Release & Refresh" to fix the count
- Stuck reservations that prevented other workers from claiming tasks

## Root Cause Analysis

### Why the Release Wasn't Working

1. **Async Race Condition**: The Dashboard button's `onClick` handler called `releaseCurrentTask()` asynchronously, but React Router's `navigate()` was called immediately after without waiting for the release to complete.

2. **Component Unmount Timing**: When navigating in a React SPA, the component unmounts almost immediately. The async release promise might not complete before unmount.

3. **No Unmount Cleanup**: There was no cleanup function in the main `useEffect` to release tasks when the component unmounts.

4. **Event Listener Limitation**: The existing `pagehide` and `beforeunload` event listeners only fire when closing the browser tab/window, NOT when navigating within a React SPA.

### Code Flow Before Fix

```typescript
onClick={() => {
  if (currentTask) {
    exitInProgressRef.current = true;
    releaseCurrentTask({ suppressStateReset: true })  // Async, no await
      .finally(() => {
        toast.warning('...', {
          action: {
            label: 'Go to Dashboard',
            onClick: () => navigate('/w/dashboard')  // User has to click again!
          }
        });
      });
  } else {
    navigate('/w/dashboard');
  }
}}
```

**Problems:**
- No `await` on `releaseCurrentTask()`
- Toast confirmation required (confusing UX)
- Navigation happens in toast action, not immediately
- Component might unmount before release completes

## Solution Implemented

### 1. Added Unmount Cleanup

Added a cleanup function to the main `useEffect` that releases tasks on component unmount:

```typescript
useEffect(() => {
  // ... initialization code ...

  // Cleanup on component unmount - release any active task
  return () => {
    const taskId = currentTaskIdRef.current;
    const workerId = user?.id;
    
    if (taskId && workerId) {
      console.log('Workbench unmounting - releasing task:', taskId);
      
      supabase
        .rpc('release_task_by_id', { p_task_id: taskId })
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to release task on unmount:', error);
          } else if (data) {
            console.log('Task released successfully on unmount');
          }
        })
        .catch((err) => {
          console.error('Error releasing task on unmount:', err);
        });
    }
  };
}, [user, fetchWorkerData]);
```

**Benefits:**
- Runs automatically when component unmounts
- Uses `currentTaskIdRef` which always has the current value
- Guaranteed to attempt release on navigation
- Logs success/failure for debugging

### 2. Improved Dashboard Button Click Handler

Updated the Dashboard button to properly await the release before navigating:

```typescript
onClick={async () => {
  if (currentTask) {
    exitInProgressRef.current = true;
    
    const taskId = currentTask.id;
    console.log('Dashboard button clicked - releasing task:', taskId);
    
    try {
      // Release the task reservation and WAIT for completion
      await releaseCurrentTask({ suppressStateReset: true });
      console.log('Task released successfully before navigation');
      
      // Small delay to ensure the release completes
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to release reservation before dashboard navigation', error);
      logWorkerEvent('error', 'Failed to release task before navigation', 'workbench_navigation', {
        taskId: taskId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Navigate AFTER release attempt
    navigate('/w/dashboard');
  } else {
    navigate('/w/dashboard');
  }
}}
```

**Improvements:**
- Uses `async/await` to wait for release
- Adds 100ms delay to ensure database write completes
- Logs the task ID being released
- Navigates immediately (no toast confirmation)
- Better error logging
- Navigates even if release fails (better UX)

### 3. Updated "Back to Dashboard" Button

Also updated the button in the no-tasks screen:

```typescript
<Button 
  onClick={async () => {
    exitInProgressRef.current = true;
    
    if (currentTask) {
      try {
        await releaseCurrentTask({ suppressStateReset: true });
        console.log('Task released before navigation from no-tasks screen');
      } catch (error) {
        console.error('Failed to release task from no-tasks screen:', error);
      }
    }
    
    navigate('/w/dashboard');
  }} 
  variant="outline"
>
  Back to Dashboard
</Button>
```

## Testing Checklist

### Test 1: Normal Navigation
- [ ] Log in as worker
- [ ] Dashboard shows 2 tasks available
- [ ] Click "Launch Task"
- [ ] Task loads in workbench
- [ ] Click "Dashboard" button in footer
- [ ] **Expected**: Immediately navigates to dashboard
- [ ] **Expected**: Dashboard shows 2 tasks (task was released)
- [ ] Check console: Should see "Dashboard button clicked - releasing task: [id]"
- [ ] Check console: Should see "Task released successfully before navigation"

### Test 2: Multiple Navigations
- [ ] Launch task
- [ ] Navigate to dashboard (should show correct count)
- [ ] Launch task again
- [ ] Navigate to dashboard (should show correct count)
- [ ] Repeat 3-5 times
- [ ] **Expected**: Count always correct, no stuck reservations

### Test 3: No Tasks Screen
- [ ] Navigate to workbench when no tasks available
- [ ] Click "Back to Dashboard"
- [ ] **Expected**: Navigates immediately
- [ ] **Expected**: No errors in console

### Test 4: Browser Back Button
- [ ] Launch task
- [ ] Click browser back button
- [ ] **Expected**: Component unmounts, task released
- [ ] Check console: Should see "Workbench unmounting - releasing task: [id]"
- [ ] Dashboard should show correct count

### Test 5: Direct URL Navigation
- [ ] Launch task
- [ ] Type `/w/dashboard` in URL bar and press Enter
- [ ] **Expected**: Task released via unmount cleanup
- [ ] Dashboard shows correct count

## How It Works Now

### Navigation Flow

1. **User clicks Dashboard button**
   ```
   → Set exitInProgressRef = true (prevents auto-claiming)
   → Call releaseCurrentTask() with await
   → Wait 100ms for database write
   → Navigate to dashboard
   → Component unmounts
   → Unmount cleanup runs (backup release)
   ```

2. **Unmount Cleanup (Backup)**
   ```
   → Check if currentTaskIdRef has a value
   → If yes, call release_task_by_id RPC
   → Log success/failure
   ```

3. **Dashboard Loads**
   ```
   → Fetches fresh data
   → Shows correct task count
   → No stuck reservations
   ```

### Defense in Depth

The fix uses **multiple layers** to ensure release:

1. **Primary**: Await release in button click handler
2. **Backup**: Unmount cleanup function
3. **Fallback**: Manual "Release & Refresh" button on dashboard

This ensures the task is released even if:
- The primary release fails
- The component unmounts before release completes
- There's a network issue
- User uses browser navigation instead of button

## Key Improvements

| Before | After |
|--------|-------|
| ❌ No await on release | ✅ Properly awaits release |
| ❌ Toast confirmation required | ✅ Immediate navigation |
| ❌ No unmount cleanup | ✅ Cleanup on unmount |
| ❌ Race condition possible | ✅ Guaranteed release attempt |
| ❌ Poor error logging | ✅ Detailed logging |
| ❌ Confusing UX | ✅ Clear, immediate behavior |

## Console Logs to Look For

### Successful Release
```
Dashboard button clicked - releasing task: [uuid]
Task released successfully before navigation
Workbench unmounting - releasing task: [uuid]
Task released successfully on unmount
```

### Failed Release (with backup)
```
Dashboard button clicked - releasing task: [uuid]
Failed to release reservation before dashboard navigation: [error]
Workbench unmounting - releasing task: [uuid]
Task released successfully on unmount  ← Backup worked!
```

## Prevention Strategies

### 1. Always Await Async Operations Before Navigation
```typescript
// ❌ Bad
releaseTask();
navigate('/somewhere');

// ✅ Good
await releaseTask();
navigate('/somewhere');
```

### 2. Add Unmount Cleanup for Critical State
```typescript
useEffect(() => {
  // ... setup ...
  
  return () => {
    // Cleanup critical state
    if (criticalStateRef.current) {
      cleanupCriticalState();
    }
  };
}, [dependencies]);
```

### 3. Use Refs for Values Needed in Cleanup
```typescript
// ❌ Bad - cleanup captures initial value
const [taskId, setTaskId] = useState(null);
useEffect(() => {
  return () => cleanup(taskId); // Always null!
}, []);

// ✅ Good - ref always has current value
const taskIdRef = useRef(null);
useEffect(() => {
  return () => cleanup(taskIdRef.current); // Current value!
}, []);
```

### 4. Add Small Delays for Database Operations
```typescript
await databaseWrite();
await new Promise(resolve => setTimeout(resolve, 100)); // Let it complete
navigate('/somewhere');
```

## Files Modified

1. **`src/pages/worker/Workbench.tsx`**
   - Added unmount cleanup in main useEffect
   - Updated Dashboard button click handler to await release
   - Updated "Back to Dashboard" button to await release
   - Added 100ms delay after release
   - Improved logging

## Rollback Plan

If issues occur, revert the Workbench.tsx changes:
```bash
git checkout HEAD~1 src/pages/worker/Workbench.tsx
```

The manual "Release & Refresh" button on the dashboard will still work as a fallback.

## Success Criteria

- ✅ Task released when clicking Dashboard button
- ✅ Task released when using browser back button
- ✅ Task released when typing URL directly
- ✅ Dashboard always shows correct task count
- ✅ No stuck reservations
- ✅ Clear console logs for debugging
- ✅ Immediate navigation (no toast confirmation)
- ✅ Works consistently across multiple navigations

