# Manual Test Matrix

## Test Coverage Overview
This matrix complements the Playwright suite by outlining the manual verification scope for each release. Use it during staging sign-off to confirm that all user flows, test cases, and QA owners have been accounted for.

## User Flows
| Flow | Description |
| --- | --- |
| Worker Marketplace | Workers browse available listings, apply, and track decisions |
| Manager Operations | Managers create listings, approve/reject applications, and manage workforce |
| Messaging Collaboration | Workers and managers exchange direct, group, and broadcast messages |
| Lifecycle & Compliance | Processes covering onboarding, training gates, offboarding, and QA controls |

## Test Cases
| Flow | Scenario | Steps | Expected Result |
| --- | --- | --- | --- |
| Worker Marketplace | Apply to active listing | Worker → `/w/projects/available` → open eligible card → Submit cover message | Toast “Application submitted”, card shows “Applied”, row inserted into `worker_applications` |
| Worker Marketplace | View application status | Worker → `/w/projects/available` → review applied card | Card displays “Applied” badge and disables button |
| Manager Operations | Create project listing | Manager → `/m/project-listings/new` → fill required fields → save | Toast “Listing created”, listing appears with unique description |
| Manager Operations | Approve application | Manager → `/m/projects/:id/applications` → Approve pending card | Toast “Application approved”, badge switches to Approved |
| Messaging Collaboration | Send message | Worker → `/w/messages/compose` → select manager → send | Toast “Message sent successfully”, message appears under Sent tab |
| Messaging Collaboration | Receive message | Manager stays on `/m/messages/inbox` while worker sends message | Manager inbox shows new unread row and read receipt updates when opened |
| Lifecycle & Compliance | Complete training gate | Worker finishes module → manager checks admin dashboard | Training status toggles to Passed and unlock calculations update |
| Lifecycle & Compliance | Submit exit survey | Worker → `/worker/exit-survey` → complete form | Row inserted into `worker_exit_surveys`, manager offboarding panel shows entry |

## QA Ownership
| Assignments | Primary QA | Backup QA | Notes |
| --- | --- | --- | --- |
| Worker Marketplace | Alice (QA) | Ravi (QA) | Verify rehire blocking messages and tier gates |
| Manager Operations | Ravi (QA) | Alice (QA) | Ensure listing CRUD and approvals respect capacity steps |
| Messaging Collaboration | Priya (QA) | Alice (QA) | Test attachments + group creation |
| Lifecycle & Compliance | Ethan (QA) | Priya (QA) | Validate training/offboarding edge cases (cooldowns, surveys) |

