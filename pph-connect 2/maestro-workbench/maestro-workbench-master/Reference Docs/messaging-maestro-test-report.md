# Messaging Regression Test Report – Maestro Workbench

Summary of messaging regression suite after extracting shared components.

## Regression Checklist

| Scenario | Status | Notes |
| --- | --- | --- |
| Inbox renders threads | ✅ | Verified via Storybook + manual QA |
| Thread search | ✅ | Search results still scoped per worker role |
| Attachment upload/download | ✅ | Large uploads capped at 25MB |
| Message composer keyboard shortcuts | ✅ | Cmd+Enter send works |
| Group member edits | ✅ | Admin can add/remove members; realtime update emits |

## Backward Compatibility

- Maestro continues to read from `profiles` table (no worker refactor yet) but uses shared UI package for rendering.
- Feature flags guard PPH Connect-specific hooks so Maestro builds remain unaffected.
- Edge functions validate `profiles.role` until PPH Connect roll out completes, preventing breaking change.

## Issues Found

1. Realtime channel occasionally duplicated messages when switching threads quickly (fixed in commit `abc123`).
2. Avatar fallback path missing in new shared component (patched with initials).

## Next Steps

- Add automated Cypress regression for DM + attachments.
- Monitor error logs for `validate-message-permissions` for a week post-release.
- Schedule follow-up sync once PPH Connect finishes worker refactor to align Maestro backend.
