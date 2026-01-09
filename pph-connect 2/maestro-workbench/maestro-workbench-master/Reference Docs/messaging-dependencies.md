# Messaging Dependencies Assessment

This note describes how Maestro's messaging feature tree maps to reusable components, what utilities can be shared with PPH Connect, and which parts must be rewritten.

## Messaging Modules Table

| Module | Location | Primary responsibility | Key dependencies |
| --- | --- | --- | --- |
| Inbox / Thread view | `src/pages/messages/GroupInfo.tsx`, `src/pages/messages/ThreadList.tsx` | Render group + direct threads, message detail | Supabase `messages`, `message_threads`, AuthContext session, `useMessageNotifications` |
| Composer | `src/components/messages/MessageComposer.tsx` | Rich text compose, attachment handoff | `supabase/functions/send-message`, storage uploads, `useMessageDraft` |
| Notifications hook | `src/hooks/useMessageNotifications.tsx` | Unread counts + realtime channel | Supabase realtime, `worker_has_role` policy |
| Group admin dialog | `src/components/messages/CreateGroupDialog.tsx` | Add/remove group members | `groups`, `group_members`, `profiles` tables |

## Messaging-specific code

- Supabase edge functions `supabase/functions/send-message` and `validate-message-permissions` include Maestro-specific schema names (`profiles`, `teams`) and rely on storage buckets named `message_attachments`.
- RLS helpers reference `public.profiles.role`; PPH Connect replaces `profiles` with `workers` metadata.
- Front-end hooks assume `MessageThreadWithProfile` types defined in `src/types/app.ts`; these include fields such as `profile.avatar_url` that do not exist in PPH Connect yet.
- Real-time channels (`supabase.channel('messages')`) emit events scoped to `team_id`, which PPH Connect does not currently expose on workers.

## Shared utilities

- UI primitives such as `MessageBubble`, `MessageAttachmentList`, and `MessageListVirtualizer` only depend on props and Tailwind tokens; they can be copied without change.
- `useMessageDraft` only relies on `localStorage` and may be reused for offline drafts.
- Type-safe fetch utilities in `src/lib/messaging/api.ts` already abstract Supabase queries; swapping table names through a config object would make them portable.
- Toast + optimistic updates reuse global stores (`useGlobalModal`, `useAuth`) already present in PPH Connect.

## Maestro-only adaptations

- Replace `profiles` references with `workers` schema; update edge functions to check `worker_has_role` and new role hierarchy.
- Update RLS policies to leverage the new `worker_metadata` columns rather than `profile.role`.
- Thread membership currently keys on `profile_id`; must be re-keyed to `worker_id` and possibly `team_id` derived from PPH Connect teams.
- Attachment uploads rely on Maestro storage bucket policies; need new bucket + signed URL flow in PPH Connect.
- Notification toast copy references “Maestro Workbench”; rename to “PPH Connect.”
