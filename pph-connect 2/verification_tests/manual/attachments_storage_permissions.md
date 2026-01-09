# Attachments Test: Storage Permissions

Steps:
1. Inspect the storage bucket config (`message-attachments`) and confirm it is private; only edge functions or authenticated users with signed URLs can access files.
2. Upload an attachment and verify that unauthenticated requests fail while downloads via the app succeed because the user session signs the request (`supabase.storage.from('message-attachments').download` uses auth headers).
3. Optional: attempt to fetch the file via direct URL; expect 401.

Result: Pass – storage permissions protect attachments outside authenticated flows.
