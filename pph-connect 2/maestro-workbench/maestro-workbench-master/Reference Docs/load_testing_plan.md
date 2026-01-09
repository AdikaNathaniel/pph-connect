# Load Testing Plan

This plan outlines how we stress the PPH Connect worker dashboard and messaging APIs using open-source tooling that we can run locally or against a staging deployment once credentials are available.

## Scenarios

1. **Worker dashboard bursts** – 100 concurrent workers refreshing `/worker/dashboard` within 60 seconds, repeating for 5 minutes to mimic top-of-hour shift changes. Measures the `GET /api/worker/stats-summary` RPC plus Supabase aggregation views.
2. **Messaging send spikes** – 50 managers broadcasting updates simultaneously via `/api/messages/broadcast`. Ensures Supabase row locks, attachment uploads, and edge functions hold up.
3. **Authentication churn** – 100 logins per minute hitting `/auth/v1/token` to confirm Supabase Auth throttling isn’t triggered.

Each scenario ramps users linearly over 30 seconds, sustains peak for 4 minutes, then ramps down to zero so we can observe recovery.

## Tooling

- **k6** drives HTTP traffic via the script in `scripts/perf/worker_dashboard_load_test.js`.
- Tests reference `BASE_URL` and `SUPABASE_ANON_KEY` environment variables; locally point to `http://localhost:5173` + mock anon key, while staging/production values live in 1Password.
- CI-friendly command: `k6 run --vus 120 --duration 5m scripts/perf/worker_dashboard_load_test.js`.
- For the heavier messaging scenario we reuse the same script with `SCENARIO=messaging` to toggle endpoints.

## Metrics & Thresholds

- **Response time:** 95th percentile < 1.5s for dashboard API, < 2.0s for broadcast API.
- **Error rate:** < 1% HTTP 5xx/4xx (excluding 401 expected errors in auth scenario).
- **Supabase limits:** Monitor `requests.count` and `db.cpu_percent` via the dashboard; alert if CPU exceeds 70% sustained for >2 minutes.
- **Results capture:** After each run, export `k6-summary.json` and paste an annotated table into `test-results/perf/<date>-load-tests/summary.md` noting whether thresholds were met.

These runs currently require an authenticated Supabase endpoint, so we stage scripts locally and will execute once we have access to the shared staging project (`pph-connect-staging`).***
