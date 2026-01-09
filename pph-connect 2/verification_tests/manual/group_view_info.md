# Group Conversation Test: View Group Info

Steps:
1. Navigate to `/m/messages/group/:groupId/info` where `GroupInfo.tsx` loads `message_groups` and current `group_members`.
2. Confirm the header shows group metadata (name, description, member count) and controls (add/remove/leave) appear for admins.
3. Verify the members table retrieves workers with their roles/emails.

Result: Pass – the group info page displays accurate metadata and member controls.
