# Direct Message Test: Mark Messages as Read

Steps:
1. With an active thread open as a worker, reload the page so that the latest messages include unread receipts (`read_at = null`).
2. Observe `Thread.tsx` calling `markMessagesAsRead`, which filters unread recipient entries and performs `supabase.from('message_recipients').update({ read_at: new Date().toISOString() })` for the current user.
3. Refresh the database view (or re-fetch thread) and verify those entries now show a timestamp.

Result: Pass – viewing a thread as a recipient updates `message_recipients.read_at` for unread messages.
