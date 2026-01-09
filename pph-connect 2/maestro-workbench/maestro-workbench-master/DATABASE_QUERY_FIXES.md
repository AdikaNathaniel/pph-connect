# Database Query Fixes - Summary

## Problem
Manager Dashboard and Worker Analytics were showing zeros/empty data despite having 46 records in the `answers` table and 43 records in the `worker_daily_activity` view.

## Root Causes Identified

### 1. Manager Dashboard Using Wrong Data Source
**Issue:** Manager Dashboard was using `useWorkerAnalytics()` hook which filters data by the current user's `worker_id`. When a **manager** viewed the dashboard, it only showed their personal worker activity (usually 0), not organization-wide data.

**Fix:** Replaced the hook with direct Supabase queries that fetch ALL data across all workers.

### 2. Components Querying Deprecated Tables
**Issue:** Several components were querying from `task_answers` and `tasks` tables which are empty/deprecated.

**Correct Tables:**
- ❌ `task_answers` → ✅ `answers`
- ❌ `tasks` → ✅ `questions`

## Files Modified

### 1. `/src/pages/manager/Dashboard.tsx` ✅
**Change:** Complete rewrite to query correct tables directly
- Now queries: `projects`, `profiles`, `questions`, `answers`
- Aggregates daily activity from `answers` table
- Shows organization-wide metrics, not user-specific

**Before:**
```typescript
const { data, loading, error } = useWorkerAnalytics(); // Wrong: shows only manager's own activity
const projectsInFlight = data?.globalSnapshot?.active_projects ?? 0;
```

**After:**
```typescript
// Direct queries for ALL data
const activeProjectsCount = await supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'active');
  
const answersCount = await supabase
  .from('answers')
  .select('*', { count: 'exact', head: true });
```

### 2. `/src/components/StatsModal.tsx` ✅
**Changes:**
- Changed `task_answers` → `answers`
- Changed `tasks` with `status` filter → `questions` with `is_answered` filter
- Fixed toast API to use Sonner syntax

**Before:**
```typescript
const { data: taskAnswers } = await supabase
  .from('task_answers') // ❌ Empty table
  .select('worker_id, aht_seconds, completion_time');

const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
```

**After:**
```typescript
const { data: taskAnswers } = await supabase
  .from('answers') // ✅ 46 records
  .select('worker_id, aht_seconds, completion_time');

const completedTasks = tasks?.filter(t => t.is_answered === true) || [];
```

### 3. `/src/hooks/use-worker-analytics.ts` ✅
**Changes:**
- Added console logging for debugging
- Added null safety for response data

**Note:** The underlying edge function (`get-worker-analytics`) was already correct - it queries from `answers` table. This hook is used by Worker Analytics page (/w/analytics) and correctly filters by worker_id.

### 4. `/src/pages/manager/Stats.tsx` ✅
**Changes:**
- Fixed toast API calls (object → string)

**Note:** This component was already querying from `answers` table correctly. This is the `/m/analytics` page that the user confirmed was working.

### 5. `/src/components/TaskForm.tsx` ✅
**Changes:**
- Fixed 5 instances of toast object rendering errors
- All toast calls now use Sonner API: `toast.error("message")`

### 6. Worker Analytics Components ✅
**Files:**
- `/src/components/worker/WorkerAnalyticsSummary.tsx`
- `/src/components/worker/WorkerAnalyticsDailyTable.tsx`
- `/src/components/worker/WorkerAnalyticsDailyChart.tsx`

**Changes:**
- Added `isNaN()` checks to prevent NaN display
- Added `Math.floor()` for seconds calculations
- Added null safety for metric displays

## Edge Functions (Already Correct ✅)

### `/supabase/functions/get-worker-analytics/index.ts`
This function was already correct:
- ✅ Queries from `answers` table (lines 109-120)
- ✅ Computes metrics from `answers` data
- ✅ Global snapshot queries from correct tables:
  - `answers` for total_answers
  - `projects` for active_projects
  - `profiles` for total_workers
  - `questions` for pending_questions

## Database Views (Already Correct ✅)

### `worker_daily_activity` view
```sql
SELECT
  a.worker_id,
  a.project_id,
  p.name AS project_name,
  a.completion_time::DATE AS activity_date,
  COUNT(*)::INTEGER AS tasks_completed,
  COALESCE(SUM(a.aht_seconds), 0)::INTEGER AS total_answer_time_seconds,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(SUM(a.aht_seconds)::NUMERIC / COUNT(*), 2)
    ELSE NULL
  END AS avg_answer_time_seconds
FROM public.answers a
LEFT JOIN public.projects p ON p.id = a.project_id
GROUP BY a.worker_id, a.project_id, p.name, a.completion_time::DATE;
```

This view correctly queries from `answers` table and has 43 records as expected.

## Testing Checklist

### Manager Dashboard (`/m` or `/m/dashboard`)
- [ ] Shows correct count for "Projects in Flight"
- [ ] Shows correct count for "Total Workers"
- [ ] Shows correct count for "Active Questions"
- [ ] Shows correct count for "Answers Inserted" (should be 46+)
- [ ] Daily chart shows answer distribution over last 14 days
- [ ] No console errors

### Worker Analytics (`/w/analytics`)
- [ ] Summary card shows correct lifetime stats
- [ ] Daily chart displays task completion trends
- [ ] Daily table shows per-project breakdowns
- [ ] No "NaN" or "0" values when data exists
- [ ] Console logs show: "Worker analytics response received: ..."

### Manager Analytics/Stats (`/m/analytics`)
- [ ] Already working ✅
- [ ] Shows 46+ answers in table
- [ ] Filters and CSV export work

### Toast Notifications
- [ ] Error toasts show clean text (no object rendering)
- [ ] Paste blocked notifications work
- [ ] Validation errors display correctly

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     ANSWERS TABLE (46 rows)                  │
│                  ✅ Primary source of truth                   │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│  Manager Dash    │    │  Worker Analytics    │
│  /m/dashboard    │    │  /w/analytics        │
│                  │    │                      │
│  Queries:        │    │  Queries:            │
│  • ALL answers   │    │  • Filtered by       │
│  • ALL projects  │    │    worker_id         │
│  • ALL workers   │    │  • Via edge function │
│  • ALL questions │    │  • Uses answers      │
└──────────────────┘    └──────────────────────┘
        │                         │
        │                         ▼
        │              ┌────────────────────────┐
        │              │ worker_daily_activity  │
        │              │ VIEW (43 rows)         │
        │              │ • Groups answers by    │
        │              │   worker/project/date  │
        │              └────────────────────────┘
        │
        ▼
┌──────────────────┐
│  Manager Stats   │
│  /m/analytics    │
│  ✅ Working       │
│  • Uses answers  │
└──────────────────┘
```

## Migration Status

All necessary database migrations have been applied:
- ✅ `20241015160000_add_reservation_time_limit.sql`
- ✅ `20241015163000_add_project_aht.sql`
- ✅ `20241015170000_add_skip_configuration.sql`

The schema now includes:
- `answers.skip_reason` (TEXT, nullable)
- `answers.skipped` (BOOLEAN, default false)
- `projects.enable_skip_button` (BOOLEAN, default false)
- `projects.skip_reasons` (JSONB, default '[]')

## Expected Results

After these fixes:
1. **Manager Dashboard** will show real counts for all 4 stat cards
2. **Manager Dashboard** will show a populated daily activity chart
3. **Worker Analytics** will show real metrics for workers who have completed tasks
4. **No more "n/a" or "0"** when data exists in the database
5. **No more NaN** in time calculations
6. **No more object rendering errors** in toasts

## Debugging

If Worker Analytics still shows zeros, check the browser console for:
```
"Worker analytics response received: {
  hasSummary: true,
  dailyActivityCount: X,
  summary: { total_completed_tasks: X, ... },
  dailyActivity: [...]
}"
```

If this log shows data but UI shows zeros, the issue is in the UI components.
If this log is missing or shows empty data, the issue is in the edge function or auth.

