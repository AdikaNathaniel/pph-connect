# Direct Message Test: Manager → Worker

Steps:
1. Seed Supabase with an `active` manager user and at least one `active` worker.
2. Sign in as the manager and open `/m/messages/compose`.
3. Use the role filter to choose “Worker” (available because Compose includes the `<SelectItem value="worker">` option) and select a worker recipient.
4. Submit the form; the component calls `supabase.functions.invoke('send-message', { recipient_ids: [...] })` with the worker’s ID.
5. Inspect the Supabase logs to confirm the message is delivered (edge function returns `success: true`) and the worker receives the thread entry.

Result: Pass – managers can send direct messages to workers via the send-message edge function.
