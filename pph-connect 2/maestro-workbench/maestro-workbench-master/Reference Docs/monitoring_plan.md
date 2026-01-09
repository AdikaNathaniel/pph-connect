# Monitoring Plan

## Error Tracking
- Integrate **Sentry** for frontend React errors (Vite plugin) and Supabase Edge Functions (Node handler).
- Configure `SENTRY_DSN` and release/version tagging via `VersionTracker`.
- Auto-capture breadcrumbs for navigation, network calls, and Redux/Context state if applicable.

## Application Monitoring
- Track Supabase usage (API calls, auth events) via Supabase dashboard alerts → notify when 80% of quota.
- Monitor Amplify metrics (build duration, bandwidth, 4xx/5xx) from Amplify console.
- Add custom health endpoint (optional) to Supabase Edge Functions for `uptime` checks.

## Database Monitoring
- Review Supabase SQL Insights for slow queries (≥200ms) weekly.
- Set `pg_stat_statements` alerts for top queries.
- Track database size growth via Supabase metrics and set Slack alert when exceeding 70% storage.

## Alerts & Notifications
- Pipe Sentry alerts and Supabase/Amplify notifications into Slack channel `#prod-alerts` (fallback: email to ops@pphconnect.com).
- Define severity levels (SEV1 downtime, SEV2 degraded, SEV3 minor) and escalation contacts.
- Document incident response in `Reference Docs/incident_response.md` (TODO).
