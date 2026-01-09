# Notifications Test: Clear on Read

Steps:
1. View a thread or group where unread messages exist; `markMessagesAsRead` / `markGroupAsRead` update `message_recipients.read_at` or `group_members.last_read_at`.
2. After the update, call `refreshUnreadCount()` from `useMessageNotifications`.
3. Confirm the unread badge decrements/clears.

Result: Pass – reading messages clears notifications via the refresh helper.
