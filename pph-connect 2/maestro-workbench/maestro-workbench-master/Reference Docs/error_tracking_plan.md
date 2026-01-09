# Error Tracking Plan

## Tool Integration
- Primary tool: **Sentry** (frontend React + Supabase Edge Functions).
- Configure `SENTRY_DSN` and release tagging via `VersionTracker` component.
- Add `Sentry.init` inside `src/main.tsx` with environment from `VITE_APP_ENV` to separate staging/production.

## Frontend Errors
- Capture React errors using Sentry’s React integration + `ErrorBoundary` wrapper around `App`.
- Include user context (role, Supabase user id) and breadcrumbs for navigation + API calls.
- Ensure sourcemaps uploaded during `npm run build` (Amplify build step) so stack traces are readable.

## Edge Function Errors
- Wrap Supabase Edge Functions (e.g., `send-message`) with Sentry handler to capture thrown errors + logs.
- Store function names, worker ids, and request ids in Sentry tags for triage.
- On failure, respond with sanitized message but log full stack trace to Sentry.

## Alerting & Triage
- Route Sentry alerts to Slack channel `#alerts-sentry` (fallback email ops@pphconnect.com).
- Severity mapping: SEV1 (auth outage), SEV2 (marketplace failure), SEV3 (non-blocking UI issues).
- Document incident follow-up in `Reference Docs/incident_response.md`.
