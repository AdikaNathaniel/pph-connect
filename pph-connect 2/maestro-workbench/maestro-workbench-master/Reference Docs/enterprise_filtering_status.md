# Enterprise Filtering Status

This document explains how the Workers list supports enterprise-grade filtering, search, and saved views.

## Workers Filters

- `/m/workers` renders `WorkersPage`, which hosts the filters drawer (engagement model, status, department, team, locale, supervisor, access gating, BGC state).
- Each change updates `filters` state and triggers a fresh `supabase.from('workers').select(...)` call that joins departments + assignments so we can filter server-side using `.eq`, `.in`, and `.contains` on JSON arrays.
- Department/team filters coordinate with the `teams` table so enterprise admins can drill into specific business units without reloading the app.

## Hook & Query Management

- `useWorkers` centralizes the Supabase query: it accepts the filter object, builds the SQL conditions, and returns `{ workers, isLoading, error, refresh }` for the table.
- The hook shares metadata (statuses, supervisors, locales) via lightweight Supabase lookups so the dropdowns remain in sync with production data.

## Saved Views & Persistence

- Filters persist in `localStorage` under `workers-filters`, letting enterprise managers keep custom slices (e.g., “LATAM contractors” or “Needs BGC renewal”).
- The table header exposes a “Saved Views” menu where users can name a filter set, recall it later, or reset to defaults.

Together these pieces satisfy the “Enterprise filtering on Workers table” requirement by providing multi-dimensional filters, server-side queries, and saved views tailored for large operations teams.
