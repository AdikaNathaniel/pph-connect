# Broadcast Messaging Test: Delivery Verification

Steps:
1. After sending any broadcast (department/team/all), query `message_recipients` in Supabase filtered by the new message ID.
2. Count rows and verify they match the intended recipient set.
3. Optionally open the inbox as one of the recipients to confirm the thread appears immediately.

Result: Pass – broadcast delivery is confirmed via `message_recipients` and UI visibility.
