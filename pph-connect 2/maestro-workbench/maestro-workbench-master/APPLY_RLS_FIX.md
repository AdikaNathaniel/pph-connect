# 🔧 Apply RLS & Release Fix

## Quick Summary
Fixed two critical issues:
1. **42501 RLS Error** when releasing tasks - workers couldn't set `assigned_to = NULL`
2. **Task not released** when navigating from Workbench to Dashboard

## 🚀 Apply in 2 Steps

### Step 1: Apply SQL Migration
**File:** `supabase/migrations/20251018000002_fix_rls_and_release.sql`

Copy and paste this entire file into your **Supabase SQL Editor** and run it.

This will:
- ✅ Fix RLS policies to allow workers to release their tasks
- ✅ Create `release_task_by_id()` function
- ✅ Improve `release_worker_tasks()` function

### Step 2: Test the Fix

1. **Log in** as maximtest1@productiveplayhouse.com
2. **Dashboard** shows 2 tasks available
3. **Click "Launch Task"** - task loads
4. **Click "Dashboard"** button in footer - should navigate immediately
5. **Dashboard** should show 2 tasks again (task was released)
6. **Launch task** again
7. **Click "Release & Refresh"** - should work without 42501 error

## ✅ Expected Results

### Before Fix
- ❌ "Release & Refresh" button → 42501 RLS error
- ❌ Navigate from Workbench → task count wrong (1 instead of 2)
- ❌ Toast confirmation required to navigate

### After Fix
- ✅ "Release & Refresh" button → works perfectly
- ✅ Navigate from Workbench → task released, count correct
- ✅ Immediate navigation (no toast confirmation)

## 📋 What Changed

### Database
- **RLS Policies**: Split into separate SELECT and UPDATE policies
- **UPDATE Policy**: Now allows `assigned_to = NULL` via `WITH CHECK` clause
- **New Function**: `release_task_by_id(task_id)` for single task release
- **Improved Function**: `release_worker_tasks()` returns detailed info

### Frontend
- **Dashboard**: Uses `release_task_by_id()` RPC instead of direct UPDATE
- **Workbench**: Uses `release_task_by_id()` RPC instead of direct UPDATE
- **Navigation**: Immediately releases and navigates (no toast confirmation)
- **Error Handling**: Better logging for debugging

## 🔍 Verify Migration Applied

Run this in SQL Editor:
```sql
-- Check new RLS policies exist
SELECT policyname FROM pg_policies
WHERE tablename = 'tasks'
  AND policyname IN (
    'Workers can view their assigned tasks',
    'Workers can update their assigned tasks'
  );
-- Should return 2 rows

-- Check new function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'release_task_by_id';
-- Should return 1 row
```

## 🆘 If Issues Persist

1. **Verify migration applied**: Run verification queries above
2. **Check for stuck reservations**: Run `MANUAL_CLEANUP.sql`
3. **Clear browser cache**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
4. **Check console logs**: Look for any errors

## 📚 Detailed Documentation

See `RLS_AND_RELEASE_FIX.md` for complete technical analysis.

---

**Status:** Ready to apply ✅

