# Group Conversation Test: Send Group Message

Steps:
1. Open a group conversation (`GroupConversation.tsx`) as a member; the composer is backed by `RichTextEditor`.
2. Compose content/attachments and submit. The page posts to `${supabaseUrl}/functions/v1/send-message` with `group_id`.
3. After success, `fetchMessages()` reruns and displays the new message.

Result: Pass – group members can post messages and see them reflected immediately.
