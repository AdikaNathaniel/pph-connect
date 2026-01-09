# Messaging Shared Library Plan

Defines how we extract Maestro messaging components into a reusable package shared by Maestro Workbench and PPH Connect.

## Packaging Strategy

- **Primary target:** Create `/packages/messaging` workspace module inside the monorepo. Provides React components, hooks, and Supabase helpers.
- **NPM distribution:** Publish as `@pph/messaging` for external consumption. Build artifacts via `tsup`, ship ESM + CJS.
- **Tech stack:** TypeScript + React 18 + Tailwind-friendly components. Expose CSS via SCSS or Tailwind plugin slot.
- **Build tooling:** Use `tsup` for bundling, `tsconfig.base.json` references for shared types, `changeset` for versioning.

## Extracted Modules

| Module | Source | Exported As | Notes |
| --- | --- | --- | --- |
| UI Components | `src/components/messages/*` | `@pph/messaging/ui` | `MessageBubble`, `MessageAttachmentList`, `ThreadSidebar`, `CreateGroupDialog` |
| Hooks | `src/hooks/useMessageNotifications.tsx`, `useMessageDraft.ts` | `@pph/messaging/hooks` | Hooks accept injected Supabase client + config object |
| Types | `src/types/messaging.ts` (new file) | `@pph/messaging/types` | Shared interfaces for `MessageThread`, `MessagePayload`, `Attachment` |
| API Helpers | `src/lib/messaging/api.ts` | `@pph/messaging/api` | Wraps Supabase RPC/Edge calls; accepts table name overrides |
| Edge Schemas | `supabase/functions/send-message`, `validate-message-permissions` | `@pph/messaging/edge` | Provide templates + helper utilities |

Extraction steps:
1. Create `/packages/messaging` with `package.json`, `tsconfig`, `src/index.ts` barrels.
2. Move shared code into package, replacing absolute imports with relative, add type-safe config (table names, bucket names).
3. Publish package to internal npm feed once tests pass; update Maestro + PPH Connect to depend on `workspace:*` version.

## Consumption Plan

- **Maestro Workbench:** Refactor existing messaging imports to point to `@pph/messaging`. Provide `MessagingProvider` (supabase client + config) at app root.
- **PPH Connect:** Install same package. Provide config mapping `workers` table + new bucket names. Feature-flag components until RLS + schema ready.
- **Versioning:** Keep package semver major aligned with platform releases (`0.x` while iterating). Document migrations in `packages/messaging/CHANGELOG.md`.
- **Testing:** Add unit tests (Vitest) within package; run in CI plus integration tests inside each host app.
