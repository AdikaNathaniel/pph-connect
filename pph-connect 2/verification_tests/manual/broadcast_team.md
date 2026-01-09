# Broadcast Messaging Test: Team

Steps:
1. Navigate to `/m/messages/broadcast` as a manager.
2. Select “Custom Selection,” use the search input to filter workers by team name (workers include `department_id`/`supervisor_id` metadata in the query), and select the entire team.
3. Compose the announcement and submit; `Broadcast.tsx` passes the selected worker IDs to the `send-message` edge function.
4. Confirm the function responds with success and that each selected teammate receives the broadcast thread.

Result: Pass – team-specific broadcasts work via the custom selection path.
