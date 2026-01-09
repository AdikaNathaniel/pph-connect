# Group Conversation Test: Leave Group

Steps:
1. Open group info as a regular member and click “Leave group.”
2. Confirm the dialog; `GroupInfo.tsx` sets `left_at = now` for the current user in `group_members`.
3. Navigate back to `/m/messages` – the group no longer appears in your groups list.

Result: Pass – members can leave a group and stop receiving messages.
