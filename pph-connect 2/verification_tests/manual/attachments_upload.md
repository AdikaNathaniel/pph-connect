# Attachments Test: Upload

Steps:
1. Open Compose (`src/pages/messages/Compose.tsx`) or GroupConversation composer; the file input (hidden `type="file"` with id `attachments`) lets users select files.
2. Select one or more files (limit enforced at 5) and send the message.
3. The component uploads each file to the `message-attachments` storage bucket and includes `{ path, name, size, type }` metadata in the `attachments` array sent to the `send-message` edge function.
4. Verify the storage bucket contains the uploaded file objects and that the message record stores attachment metadata.

Result: Pass – attachment uploads succeed and metadata is persisted with messages.
