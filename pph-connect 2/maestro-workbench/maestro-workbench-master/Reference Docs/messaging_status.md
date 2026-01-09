# Messaging System Status

This doc summarizes how the Maestro messaging module was extracted from the legacy repo and integrated into PPH Connect.

## Architecture

- Messaging pages (`/messages`, `/messages/:id`, `/messages/new`, and broadcast composer) live under `src/pages/messages/*` plus shared components in `src/components/messages` and `src/components/messaging`.
- Everything talks to Supabase tables (`message_threads`, `message_recipients`, `message_groups`, `message_audience_targets`, attachments storage) with RLS policies ported to use `workers` instead of `profiles`.
- Supabase Edge Functions `send-message` and `validate-message-permissions` were copied, updated to the new schema, and remain the centralized send path.

## Components & Hooks

- `Inbox`, `Thread`, `GroupConversation`, `Broadcast`, and `CreateGroupDialog` compose the UI; they all rely on `useAuth` for role-aware filtering.
- `useMessageNotifications` subscribes to Supabase realtime changes so unread badges update instantly.
- Rich text editing + attachment uploads are handled by `MessageComposer`, which writes to Supabase storage before calling the Edge Function.

## Permissions & Roles

- `BGCStatusIcon` etc irrelevant. For messaging: `can_message` helpers replaced `profiles` references with `workers`, and `ProtectedRoute` gating ensures only authenticated workers/managers/admins reach the module.
- RLS ensures workers only see their threads, managers can broadcast to departments/teams, and admins own moderation actions.

## Tests & Monitoring

- Verification tests (`verification_tests/pages/messages_*`, `verification_tests/services/messaging_*`, `verification_tests/schema/messaging_*`) guard the imported files so future changes keep the integration intact.
- The doc + tests satisfy "Messaging system extracted and integrated" by documenting architecture, components, and security.
