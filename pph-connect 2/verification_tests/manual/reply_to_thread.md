# Direct Message Test: Reply to Thread

Steps:
1. Use Supabase data where a worker and manager share a message thread (created via the `send-message` function).
2. As either participant, open `/m/messages/thread/:id` and compose a reply using the rich text editor.
3. Submitting the reply hits the `fetch(${supabaseUrl}/functions/v1/send-message, { thread_id })` path in `Thread.tsx`, reusing the thread and automatically gathering prior recipients.
4. Refresh the thread – `fetchMessages` orders by `sent_at DESC`, reverses the list, and the new reply now appears in the timeline.

Result: Pass – replying queues `thread_id` through the edge function and updates the thread view.
