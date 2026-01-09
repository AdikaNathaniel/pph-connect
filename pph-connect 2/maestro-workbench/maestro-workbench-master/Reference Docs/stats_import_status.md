# Stats Import & Processing Status

This document summarizes how CSV stats are imported, validated, and surfaced across dashboards.

## Import Pipeline

- `runStatsImport` (`src/lib/stats/etl.ts`) accepts CSV payloads, parses rows with Papaparse, and normalizes worker email + project codes.
- The pipeline fetches worker accounts, projects, locale mappings, and `rates_payable` records so each row can calculate earnings + currency before inserting into `work_stats`.
- Imports run in batches (default 50) and write to `work_stats` with `imported_at` timestamps for audit trails.

## Validation & Enforcement

- `validateStatsRows` (`src/lib/stats/validation.ts`) blocks rows with unknown worker accounts, projects, bad dates, or non-numeric units/hours before the ETL proceeds.
- Locale mapping helpers fall back to project locales or the global default (`en-US`), ensuring downstream dashboards can group stats by locale.
- Errors surface back to the uploader and the CLI via `validationMessages`, so teams can fix source files before retrying.

## Dashboards & Reporting

- Manager Stats page (`src/pages/manager/Stats.tsx`) allows filtering by project/date and exports CSVs for finance teams; it queries `answers` and `work_stats` to show completion rates and AHT.
- Worker-facing pages—`WorkerEarnings`, `workerAnalyticsService`, and the Leaderboard—read from `work_stats` to show totals, trends, and comparisons.
- Verification tests (`verification_tests/lib/stats_etl_pipeline.test.mjs`, `verification_tests/pages/stats_dashboard_structure.test.mjs`, etc.) guard the pipeline + UI wiring so stats stay reliable.
