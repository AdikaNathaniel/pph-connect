# Group Conversation Test: Add/Remove Members

Steps:
1. Open group info (`GroupInfo.tsx`) as an admin; the members table lists current `group_members`.
2. Use the “Add members” control to open the dialog (reuses worker list). Selecting users inserts into `group_members`.
3. Remove a member via the “Remove” button; this triggers `supabase.from('group_members').update({ left_at: now })`.
4. Refresh group info; the member list updates to reflect additions/removals.

Result: Pass – admins can add or remove group members via the info page controls.
