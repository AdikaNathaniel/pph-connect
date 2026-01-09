# Broadcast Messaging Test: All Workers

Steps:
1. Open `/m/messages/broadcast` while logged in as admin.
2. Choose “Role” targeting, set dropdown to “Worker” so the `broadcastType === 'role'` branch filters by `worker_role`.
3. Compose subject/content and submit; the component builds `recipient_ids` of every active worker and invokes `send-message`.
4. Inspect Supabase logs to confirm a recipient record exists for each worker.

Result: Pass – role-based filter enables broadcasting to all workers at once.
