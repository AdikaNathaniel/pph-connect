# Group Conversation Test: Track Read Status

Steps:
1. As a group member, open the conversation view (`GroupConversation.tsx`).
2. The `markGroupAsRead` function updates `group_members.last_read_at` upon load; verify in Supabase that the timestamp changes.
3. Another member sends a new message; the first member sees unread indicators (based on last_read_at) until revisiting the group, at which point the timestamp updates again.

Result: Pass – read status is tracked at the group membership level.
