# QA Test Plan

## Test Objectives
- Validate critical marketplace, messaging, and lifecycle flows before release.
- Confirm Playwright automation coverage and identify gaps requiring manual verification.
- Ensure regression history and release sign-off are documented for each deployment.

## Test Environments
- **Local Preview (`npm run preview`)**: Used for rapid iteration; connects to Supabase staging via `.env.integration` secrets.
- **Staging (Supabase project: `pph-connect-staging`)**: Mirrors production schema; run manual validation here before go-live.
- **CI GitHub Actions (`ci.yml`)**: Executes `npm run ci:verify` + `npm run e2e` against preview server to guard merges.

## Manual Test Matrix
| Area | Scenario | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| Worker Marketplace | Apply to project listing | Listing exists, worker eligible | Worker logs in → `/w/projects/available` → click `Apply` → submit cover message | Toast `Application submitted` and listing badge changes to `Applied` |
| Manager Approvals | Approve pending application | Pending application exists | Manager → `/m/projects/:id/applications` → press `Approve` | Toast `Application approved`, status badge updates |
| Messaging | Compose + send message | Worker + manager accounts active | Worker → `/w/messages/compose` → select recipient → submit | Toast `Message sent successfully`, message appears under Sent tab |
| Bulk Upload | Import worker CSV | CSV formatted with required columns | Manager → `/m/workers` → Bulk Upload → validate file → confirm import | Import progress reaches 100%, toast `Workers imported`, workers visible |
| Offboarding | Trigger training completion + exit survey | Worker with pending exit | Worker completes exit survey → manager checks offboarding dashboard | Survey row stored, offboarding checklist updates |

## Automation Mapping
- Playwright specs live in `e2e/flows/*.spec.ts` and cover login, add worker, bulk upload, assign, self-service, messaging, project listing creation, apply, approve.
- Verification guard tests are in `verification_tests/e2e/*.test.mjs` to ensure spec structure and data-test IDs remain stable.

## Regression Data
- Track bugs and fixes per release in `VERSION_HISTORY.md`.
- Update this plan when new flows are added (e.g., forum, knowledge base, offboarding enhancements).

## Pre-Launch Sign-off Checklist
1. ✅ CI pipeline green (`ci.yml`)
2. ✅ Manual matrix validated on staging
3. ✅ Version bumped via `npm run version:update`
4. ✅ QA lead + engineering manager approval recorded in release notes
