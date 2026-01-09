# Messaging Sync Plan

Defines how Maestro Workbench and PPH Connect keep messaging code in sync going forward.

## Source of Truth

- **Primary codebase:** Maestro Workbench remains the canonical source for messaging components, hooks, and edge functions until PPH Connect fully adopts shared package `@pph/messaging`.
- **Shared library:** Once `/packages/messaging` reaches v1.0, the package becomes the single source for shared UI + hooks. Host apps only maintain thin wrappers.
- **Data model evolution:** Migrations live in PPH Connect first; Maestro pulls schema updates through the shared Supabase migrations folder.

## Sync Process

1. **Development workflow**
   - Build features in Maestro, land PR with `packages/messaging` + app changes.
   - Bump package version via `changeset` and publish to internal registry.
   - Update PPH Connect `package.json` to reference new version (`workspace:*` during monorepo dev, semver tag for release).
2. **Manual cherry-picks (until shared package is stable)**
   - Use `scripts/sync-messaging.sh` to copy components from Maestro to PPH Connect.
   - Run `npm run lint` + `npm run test` in both repos.
3. **Review checklist**
   - Confirm Supabase types updated (`npm run supabase:types`).
   - Validate edge functions still deploy (CI job `deploy-edge-functions`).
   - Document noteworthy changes in `Reference Docs/messaging-sync-plan.md`.

## Automation Ideas

- **CI bot:** Add Github Action that triggers on Maestro messaging PRs to open a sync PR in PPH Connect referencing the shared package bump.
- **Changeset enforcement:** Fail CI if packages/messaging changes lack a changeset entry referencing both apps.
- **Schema drift check:** nightly job compares Supabase migrations between repos to ensure messaging tables are identical.
- **Playwright smoke test:** shared workflow that runs messaging E2E tests in both apps after a sync PR merges.
