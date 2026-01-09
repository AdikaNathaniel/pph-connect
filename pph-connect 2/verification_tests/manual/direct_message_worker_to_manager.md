# Direct Message Test: Worker → Manager

Steps:
1. Populate Supabase with an `active` worker (`worker_role = 'worker'`) and a manager (`worker_role = 'manager'`).
2. Sign in as the worker and open `/m/messages/compose`.
3. Attempt to select another worker – UI correctly hides other workers due to the `.neq('worker_role', 'worker')` constraint (verified via `Compose.tsx` logic).
4. Select the manager recipient, enter subject/content, and submit which triggers `supabase.functions.invoke('send-message')`.
5. Confirm (via logs and worker assignments) that the edge function receives `recipient_ids` containing the manager ID and returns `{ success: true }`.

Result: Pass – workers can only send direct messages to managers/admins and the request flows through the `send-message` function.
