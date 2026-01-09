# Analytics Plan

## Tool Selection
- Primary option: **Plausible Analytics** (privacy-first, simple event API).
- Alternative: **Google Analytics v4** (if advanced segmentation required). Keep consent banner ready.
- Instrument via Vite entry (`src/main.tsx`) and environment variable `VITE_ANALYTICS_PROVIDER`.

## Events & Page Views
| Area | Event/Metric |
| --- | --- |
| Navigation | Page views (`/`, `/m/dashboard`, `/w/projects/available`, etc.) |
| Marketplace | Button clicks: `Apply`, `Create Listing`, `Approve`, `Reject` |
| Messaging | Compose submission, unread counts, group creation, form submissions |
| Lifecycle | Training modal opens, exit survey submit |

Implementation steps:
1. Add analytics helper (`src/lib/analytics.ts`) to wrap provider SDK.
2. Trigger `trackEvent('apply_project', { listingId })` etc. from React components.
3. Keep event schema in `Reference Docs/analytics_plan.md` and update when flows change.

## Privacy & Consent
- Display consent banner for EU users (if GA enabled) and store opt-out in local storage.
- Plausible can be run without cookies; document fallback provider.
- Update privacy policy with data retention and link to analytics opt-out instructions.
- Ensure Supabase data is not sent to analytics; only aggregate event metadata.

## Verification
- Test locally by setting `VITE_ANALYTICS_DEBUG=true` to log events to console.
- Use browser devtools to verify network requests to analytics provider.
- Run smoke test on staging before enabling production analytics.
- Document results in QA Test Plan and attach screenshots for each release.


GDPR and privacy preferences are enforced via the existing consent banner (see privacy policy), and analytics events will only fire after opt-in.