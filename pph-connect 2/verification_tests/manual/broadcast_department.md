# Broadcast Messaging Test: Department

Steps:
1. Sign in as manager/admin and open `/m/messages/broadcast`.
2. Choose “Department” targeting, select a department from the dropdown.
3. Compose subject/content via `RichTextEditor`, optionally add attachments.
4. Submit; `Broadcast.tsx` invokes `supabase.functions.invoke('send-message', { group_id: null, recipient_ids: [...] })` where recipient list is filtered by department.
5. Confirm edge function returns success and department members receive thread entries.

Result: Pass – department broadcast routes through the send-message function using the department filter.
