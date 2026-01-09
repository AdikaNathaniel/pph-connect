# Worker Detail Status

This page documents how the manager worker-detail view is structured and which data sources each tab consumes.

## Overview

- Route: `/m/workers/:id` mounted from `App.tsx` and guarded by `ProtectedRoute requiredRole="manager"`.
- Data load: `supabase.from('workers').select('..., worker_accounts(*), worker_assignments(*, projects(*, departments(*)))').eq('id', workerId)` plus follow-up queries for training, gates, stats, and invoices.
- Inline edits: key fields (role, contact info, locale, status) use `react-hook-form` + Zod via `workerFormSchema` to persist updates back to `workers`.

## Tabs

| Tab | Primary Purpose | Components / Notes |
| --- | --- | --- |
| Accounts | List every linked `worker_accounts` record, provide Replace/History actions, launch `ReplaceAccountModal`. |
| Projects | Show active `worker_assignments` with project codes, statuses, and removal helpers (`RemoveAssignmentModal`, `AssignToProjectModal`). |
| Training | Display `worker_training_materials` completions and gate attempts; emphasize scores and status badges. |
| Qualifications | Surface `skill_assessments`, certifications, and upcoming evaluations for the worker. |
| Earnings | Summaries from `calculateWorkerBalance` and breakdown tables for total/task earnings. |
| Invoices | Lists documents from `supabase.from('invoices')` plus preview/download actions for finance teams. |
| Activity | Renders audit timeline (`offboarding_events`, assignments, training history) for compliance reviews. |

## Supabase Queries & Actions

- Accounts tab hits `worker_accounts`, `worker_account_history` (via modal) and posts updates whenever access is revoked or replaced.
- Projects tab interacts with `worker_assignments`, `project_listings`, and uses the offboarding service for removals.
- Training / Qualifications tabs query `worker_training_assignments`, `training_gates`, `skill_assessments`, and `worker_training_progress`.
- Earnings tab relies on `work_stats` aggregation plus `rates_payable` to compute currency-aware totals.
- Invoices tab selects from `invoices`, `invoice_line_items`, and links to `invoiceService.generateInvoicePdf` for previews.
- Activity tab reads `offboarding_events`, `worker_goal_history`, and audit tables to show chronological context.

Together these sections satisfy the Phase 1 checkbox “Worker detail page with tabs complete” by covering read + action flows for every managerial need.
