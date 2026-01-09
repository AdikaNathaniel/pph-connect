# Attachments Test: Download

Steps:
1. Open a thread (`Thread.tsx`) containing attachment metadata.
2. Click the download button; `downloadAttachment` fetches from the `message-attachments` bucket via `supabase.storage.from('message-attachments').download(path)`.
3. The code creates an object URL and triggers a download in the browser.

Result: Pass – attachments can be downloaded from storage and rendered to the user.
