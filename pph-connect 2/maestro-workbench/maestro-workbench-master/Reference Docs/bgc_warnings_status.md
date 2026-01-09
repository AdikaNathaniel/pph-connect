# BGC Warnings Status

This note documents where background-check warnings surface in the app and how they map to Supabase data.

## Dashboard Alerts

- `useBGCAlerts` runs two Supabase queries:
  - `supabase.from('workers').select('id, full_name, hr_id, bgc_expiration_date').gte(...).lte(...)` for **expiring within 30 days**.
  - `supabase.from('workers').select(...).lt('bgc_expiration_date', today)` for **already expired**.
- `src/pages/manager/Dashboard.tsx` renders “Expiring soon” and “Expired” cards, shows counts, and links managers to `/m/workers` filtered by BGC status.

## Workers Table

- `WorkersTable` includes a “BGC Status” column that renders `<BGCStatusIcon expirationDate={row.original.bgc_expiration_date} />` for every worker row.
- The icon changes color/message for “Valid”, “Expires in X days”, “Expired N days ago”, or “No BGC on file”, and exports `data-testid="bgc-status-icon"` for QA.
- The BGC expiration field is editable via `WorkerForm` / `WorkerFormModal`, so managers can update the date and triggers re-validations.

## Worker Detail Header

- `WorkerDetail` shows the icon next to the worker name, plus the formatted expiration date inside the profile summary.
- The inline profile card lists “BGC Expiration” with `formatDate(worker.bgc_expiration_date)` and the header badge keeps the manager aware of urgent follow-ups.

Together these surfaces satisfy “BGC warnings display correctly” by covering proactive alerts, list-level indicators, and detailed context on the drill-down page.
