# Notifications Test: Unread Count Badge

Steps:
1. Load the inbox header – it uses `useMessageNotifications` to show the unread badge.
2. With unread messages (worker has unread message_recipients), the hook fetches the count via Supabase and sets `unreadCount`.
3. Confirm the badge displays the correct number and disappears when `unreadCount = 0`.

Result: Pass – unread badge reflects the count from `useMessageNotifications`.
