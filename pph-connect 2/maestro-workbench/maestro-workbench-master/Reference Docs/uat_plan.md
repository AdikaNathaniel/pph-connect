# User Acceptance Testing (UAT) Plan

## Participant Invitations
| Role | Candidate Users | Goals |
| --- | --- | --- |
| Admins | Internal ops lead + compliance reviewer | Validate governance + reporting views |
| Managers | Staffing lead + marketplace owner | Exercise listing creation, approvals, messaging |
| Workers | 3 power users + 2 new hires | Confirm worker dashboard, applications, notifications |

**Invitation Process**
1. Send calendar invite with agenda + scope (48h notice).
2. Share staging credentials (or Okta group) and password reset instructions.
3. Provide Zoom/Meet link and Slack channel `#uat-feedback` for ad-hoc questions.

## UAT Environment
- **Staging Supabase project** with anonymized but production-like data.
- `.env.uat` includes service keys + Playwright secrets (read-only for testers).
- Latest `main` deployed via `npm run build && npm run preview` on staging host.
- Feature flags aligned with upcoming release (forum, marketplace, messaging, lifecycle modules enabled).

## Test Agenda
| Time | Topic |
| --- | --- |
| 0-10 min | Kickoff, recap objectives, review known issues |
| 10-30 min | Managers walk-through: create listing, approve/reject applications, broadcast message |
| 30-45 min | Workers walk-through: dashboard tour, apply to listing, messaging, self-service earnings |
| 45-55 min | Cross-role workflows: worker applies → manager approves, verify notifications |
| 55-60 min | Debrief, capture action items |

## Feedback Collection
- Central form: `Notion > QA > UAT Feedback` capturing severity, repro steps, screenshots.
- Slack `#uat-feedback` for realtime blockers (triaged by QA lead).
- Record session (Zoom) for reference and share timestamped notes.
- Tag actionable bugs in Linear/Jira with label `uat`.

## Prioritization & Handoff
1. QA lead reviews all submissions same day.
2. Classify into **Blocker**, **Must Fix**, **Follow-up** categories.
3. Blockers/Must Fix converted to Jira tickets and assigned by engineering manager.
4. QA retests fixes in staging; update UAT sheet with status.
5. Provide final sign-off summary to PM + stakeholders before production release.
6. PM + Engineering prioritize remaining follow-ups in grooming before release freeze.
