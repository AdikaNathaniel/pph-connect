# Workers CRUD Status

This doc summarizes how the worker directory, creation form, and removal modals work inside Maestro Workbench.

## Worker Directory

- `/m/workers` renders `WorkersPage/WorkersTable`, which queries `supabase.from('workers').select(...)` with filters for status, supervisor, and locale.
- Bulk upload actions live in `BulkUploadModal` (CSV template + validation) and leverage `workerFormSchema`/`mapRowToWorkerValues` helpers.
- Row actions open `WorkerDetail` for drill-down edits, and queries hydrate related tables such as `worker_accounts` and `worker_assignments`.
- Saved views allow enterprise managers to persist filter sets (locale, department, status) to `localStorage`, so they can quickly return to slices like "LATAM Contractors" or "Needs BGC" directly from the table header menu.

## Create & Update Flow

- `WorkerForm` + `WorkerFormModal` power both create and edit flows; they reuse the shared Zod schema and enforce uniqueness by querying `supabase.from('workers').select('id').eq(...)` on blur.
- Submission normalizes payloads and calls parent callbacks that run `supabase.from('workers').insert(...)` for create or `.update(...)` for edit, ensuring locales and emails are trimmed before writing.
- The vitest suite in `src/components/__tests__/WorkerForm.test.tsx` exercises the normalized submission path and ensures locale arrays propagate correctly.

## Removal & Termination

- `RemoveAssignmentModal` and the offboarding workflow rely on `offboardingService.processOffboardingStep`, which updates `worker_assignments`, `worker_accounts`, and logs steps in `offboarding_events`.
- Offboarding triggers (policy, voluntary, etc.) eventually call the invoice generation helpers to finalize payouts before the worker is fully removed.
- These flows guarantee that CRUD coverage spans create/update/delete, satisfying the "Workers CRUD fully functional" acceptance criteria.

## Saved Views & Persistence

- Filters selected on `/m/workers` are serialized into `localStorage` under `workers-filters`, which hydrates on load to preserve user context even after refreshes.
- Users can store multiple saved views with friendly names, recall them from the menu, or reset to defaults, giving enterprise admins quick access to curated worker cohorts.
