# Group Conversation Test: Create Group

Steps:
1. Sign in as an admin/manager and open the inbox (`src/pages/messages/Inbox.tsx`) groups tab.
2. Click “New Group,” which renders `CreateGroupDialog` (`src/components/messages/CreateGroupDialog.tsx`) and fetches active workers from `public.workers`.
3. Select members via the checkbox list, enter name/description, and submit. The dialog inserts into `message_groups` and `group_members`.
4. Refresh inbox groups; the new group appears with member count.

Result: Pass – group creation succeeds via the dialog and data surfaces in the inbox groups list.
