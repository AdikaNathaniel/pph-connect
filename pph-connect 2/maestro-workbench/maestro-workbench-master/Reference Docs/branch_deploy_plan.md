# Branch Deployment Plan

## Branch Mapping
| Branch | Target Environment | Notes |
| --- | --- | --- |
| `main` | Amplify production app | Auto deploy on merge; custom domain `app.pphconnect.com` |
| `develop` | Amplify staging app | Used for QA/UAT; seeded staging Supabase project |
| `feature/*` | Amplify preview builds | On-demand previews for PRs; share ephemeral URLs with reviewers |

## Deployment Rules
- Enable **automatic deployments** in Amplify for `main` and `develop`.
- For `feature/*`, configure Amplify preview builds (Amplify console → Preview builds → Enable). Builds destroy when PR closes.
- Ensure environment variables (Supa URL/keys, analytics) match target environment.
- Protect `main` with required status checks (CI + Playwright) before merge.

## Notifications & Preview URLs
- Amplify console → App settings → Notifications: connect Slack webhook `#deployments` (fallback email ops@pphconnect.com).
- Pull Request description template should include preview URL (`https://<preview-id>.amplifyapp.com`).
- Document preview links in PR comments for stakeholders.
- Keep this plan updated when branch strategy changes.
