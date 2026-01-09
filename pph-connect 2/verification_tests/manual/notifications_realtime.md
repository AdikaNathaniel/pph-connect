# Notifications Test: Real-time Update

Steps:
1. Enable the optional realtime subscription in `useMessageNotifications` (commented block) or simulate by calling the hook within a component that subscribes to `message_recipients`.
2. Send a new message; the subscription increments unread count via `setUnreadCount(prev => prev + 1)`.
3. Confirm the badge updates without page refresh.

Result: Pass – real-time notifications work when the subscription block is enabled.
