# Messaging Component Migration Plan

Strategy for moving Maestro messaging UI into PPH Connect while aligning with the worker-centric schema.

## File Copy Plan

1. **Identify source files**
   - Components: `src/components/messages/*` (`MessageBubble`, `MessageAttachmentList`, `MessageThread`, `CreateGroupDialog`, `MessageComposer`).
   - Pages: `src/pages/messages/*`, `src/pages/worker/MessagesInbox.tsx`.
   - Hooks: `src/hooks/useMessageNotifications.tsx`, `src/hooks/useMessageDraft.ts`.
   - Styles/assets: `src/styles/messages.css`, icon assets under `public/icons/messages/*`.
2. **Destination layout**
   - `pph-connect/src/components/messaging/*`, `pph-connect/src/pages/messaging/*`.
   - Maintain same folder structure to ease diffs.
3. **Automation**
   - Use `rsync`/`cp -R` script to copy files, followed by lint + format.

## Import Path Updates

- Replace `@/components/...` to relative paths or new package alias `@/messaging` within PPH Connect.
- Update shared hooks to use new shared library (`@pph/messaging/hooks`) once published; until then, keep a temp `lib/messaging` folder.
- Ensure `supabase` imports point to PPH Connect client (`src/integrations/supabase/client`).

## Profiles to Workers Mapping

- Workers table mapping: all messaging joins read from the canonical **workers table** (`public.workers`) so status/role changes stay consistent; migrations ensure every message/thread references `workers.id`.
- Replace types: `Profile` -> `WorkerSummary` (`id`, `full_name`, `avatar_url`, `role`).
- `message_threads.profile_id` -> `worker_id`; update queries + Supabase types accordingly.
- Edge functions `send-message` and `validate-message-permissions` should look up `workers` table and respect `worker_has_role` helper.
- Group membership: `group_members.profile_id` -> `worker_id`; ensure PPH Connect migrations updated accordingly.
- Worker metadata mapping:
  - `profiles.avatar_url` -> `workers.avatar_url` (new column) or fallback to generated initials.
  - `profiles.team_id` -> derive from `worker_assignments` or new `workers.team_id` column; necessary for group filters.
  - `profiles.role` -> `workers.role_metadata.role`; use helper `normalizeRole`.
  - When messages render, join against `workers` to read `status` so suspended workers can't post (enforced via RLS predicate referencing `workers.status = 'active'`).

## Testing Strategy

1. **Unit tests**
   - Add minimal Vitest/React Testing Library coverage for `MessageThread` rendering using new worker data.
2. **Integration**
   - Run `npm run dev` locally, verify inbox loads with seeded data.
   - Trigger Supabase edge function locally to confirm `workers` mapping works.
3. **Manual checklist**
   - Send worker-to-manager message.
   - Upload attachment.
   - Verify unread counts update in nav.
   - Confirm role gating: worker cannot access manager threads.
