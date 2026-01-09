# PPH Connect Backup & Recovery Plan

This document captures how we configure Supabase automated backups for the PPH Connect workspace, how we validate that the snapshots are restorable, and who to contact during an incident.

## Automated Backups

- **Supabase project:** `pph-connect-production` (same identifier used in our deployment plan).
- **Automation:** Supabase managed backups remain enabled in the dashboard. Platform Engineering confirms the toggle is on after every environment change and whenever Supabase posts a maintenance notice.
- **Schedule:** Daily snapshot run at 02:00 UTC covering the full Postgres database (tables, RLS, functions).
- **Retention policy:** Leave retention at 30 days which keeps the trailing 30 snapshots accessible for point-in-time recovery.
- **Verification checklist (weekly):**
  1. Open Supabase → Project settings → Backups.
  2. Confirm the latest backup timestamp is < 24 hours old.
  3. Download the most recent snapshot metadata to `secure-backups/README.md` for audit.
  4. Log confirmation in `Reference Docs/deployment_plan.md` release section.
- **Manual snapshots:** Before large migrations, run `supabase db backup --project-ref $SUPABASE_REF` and archive the `.sql` artifact in the encrypted S3 bucket alongside deployment notes.

## Restoration Test

Quarterly we run a supervised restoration drill against the staging Supabase project:

1. Download the newest production backup from Supabase.
2. Provision (or reset) the staging Supabase instance.
3. Use `supabase db restore --project-ref $STAGING_REF --file backup.sql` to load the snapshot.
4. Run `verification_tests/schema/*.test.mjs`, `npm run test`, and `npm run e2e` to confirm schema + critical flows still pass.
5. Record the restoration timestamp, operator, and outcome in `Reference Docs/monitoring_plan.md`.
6. If discrepancies appear, file a P1 ticket and keep the staging project quarantined until resolved.

## Disaster Recovery

- **Trigger conditions:** Production Supabase data corruption, accidental deletion, or cloud incident that cannot be resolved within 30 minutes.
- **Decision tree:**
  1. Incident commander (IC) opens `#pph-connect-incident` and assigns roles.
  2. IC schedules maintenance window and posts ETA to Statuspage.
  3. Database owner restores the latest healthy backup to production or a warm standby, validates read/write traffic, then reopens access.
- **Contacts:**
  - *Primary IC:* maya.chen@pphconnect.test (Head of Platform)
  - *Database owner:* devon.sousa@pphconnect.test
  - *On-call engineer:* `@pph-connect-oncall` Slack alias (24/7 rotation)
  - *Business escalation:* operations@pphconnect.test
- **Communication plan:** IC posts start/stop updates in Statuspage, #executive-briefings, and worker portal banner. The support team emails impacted customers with workaround guidance.
- **Post-incident:** Within 48 hours log the root cause, recovery timeline, and preventive actions in `Reference Docs/monitoring_plan.md` and update this document if procedures change.

