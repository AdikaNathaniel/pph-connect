# Load Testing Summary — 22 Nov 2025

We prepared the k6 scenarios but could not execute them end-to-end because staging Supabase credentials are not available in this workspace. The table below captures the target metrics and current status.

## Metrics

| Scenario | Target p95 | Observed p95 | Target error rate | Observed error rate | Status |
| --- | --- | --- | --- | --- | --- |
| Worker dashboard burst | < 1.5s | _Blocked (no staging access)_ | < 1% | _Blocked (no staging access)_ | Blocked |
| Messaging broadcast spike | < 2.0s | _Blocked_ | < 1% | _Blocked_ | Blocked |
| Auth churn | < 1.0s | _Blocked_ | < 1% | _Blocked_ | Blocked |

## Notes & Blockers

- Blocked until we can hit a Supabase deployment; local Vite dev server lacks the required RPC endpoints, so results would be meaningless.
- Once credentials are available, run `k6 run --vus 120 --duration 5m scripts/perf/worker_dashboard_load_test.js` with `BASE_URL=https://staging.pphconnect.test`.
- Capture the generated `summary.json` plus k6 HTML trend reports and attach them to this directory for auditing.
