# Messaging Test Report – PPH Connect

Manual + automated checks verifying messaging flows after migrating Maestro components.

## Test Matrix

| Scenario | Steps | Result |
| --- | --- | --- |
| Worker → Manager DM | Worker A sends message to Manager B, manager replies | ✅ Delivered, thread read/unread updates |
| Manager → Worker broadcast | Manager sends broadcast to worker group | ✅ All recipients receive, unsubscribed worker blocked |
| Admin ↔ Manager ↔ Worker triad | Admin posts in thread with manager + worker simultaneously | ✅ Role-based visibility works; worker cannot see admin-only thread |
| Attachment upload (5MB) | Worker uploads image, manager downloads | ✅ Pass |
| Attachment > limit | Worker uploads 30MB file | ✅ Blocked with toast |

## Cross-user Messaging

- Verified **admin ↔ manager ↔ worker** permutations:
  - Admin → Manager thread creation succeeded; manager can reply, worker blocked by RLS.
  - Manager ↔ Worker DM works in both directions with read receipts.
  - Worker ↔ Worker DM accessible only if both share same project thread membership.

## Edge Cases

- **Offline queue:** Simulated offline mode (DevTools throttling). Draft saved via `useMessageDraft`; message auto-sent after reconnect.
- **Large attachments:** Files >25MB rejected with `MESSAGING_ATTACHMENT_TOO_LARGE`. UI shows toast.
- **Re-auth:** Session expiry prompts re-login before sending message; no duplicate sends observed.
- **Thread deletion:** Manager removing worker from group removes access on next fetch.

## Follow-ups

- Add automated Playwright smoke covering DM + attachment flows.
- Monitor Supabase realtime disconnect logs; occasional stale unread counts observed.
- Document max attachment size in worker handbook.
