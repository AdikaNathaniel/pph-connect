# E2E Coverage Overview

## Overview
This document summarizes the Playwright coverage for critical production flows defined in `TODOS.md`. Each workflow has a corresponding spec under `e2e/flows` plus a verification guard under `verification_tests/e2e`. Use this table before releases to confirm automation exists and to identify any manual follow-ups.

## Playwright Specs
| Flow | Spec File |
| --- | --- |
| User login | `e2e/flows/login.spec.ts` |
| Add worker | `e2e/flows/add-worker.spec.ts` |
| Bulk upload workers | `e2e/flows/bulk-upload.spec.ts` |
| Assign worker to project | `e2e/flows/assign-worker.spec.ts` |
| Worker self-service | `e2e/flows/worker-self-service.spec.ts` |
| Send message | `e2e/flows/send-message.spec.ts` |
| Create project listing | `e2e/flows/create-project-listing.spec.ts` |
| Apply to project | `e2e/flows/apply-project.spec.ts` |
| Approve application | `e2e/flows/approve-project-application.spec.ts` |

## Verification Guards
| Flow | Guard Test |
| --- | --- |
| User login | `verification_tests/e2e/login_flow_spec.test.mjs` |
| Add worker | `verification_tests/e2e/add_worker_flow_spec.test.mjs` |
| Bulk upload workers | `verification_tests/e2e/bulk_upload_flow_spec.test.mjs` |
| Assign worker to project | `verification_tests/e2e/assign_worker_flow_spec.test.mjs` |
| Worker self-service | `verification_tests/e2e/worker_self_service_flow_spec.test.mjs` |
| Send message | `verification_tests/e2e/send_message_flow_spec.test.mjs` |
| Create project listing | `verification_tests/e2e/create_project_listing_flow_spec.test.mjs` |
| Apply to project | `verification_tests/e2e/apply_project_flow_spec.test.mjs` |
| Approve application | `verification_tests/e2e/approve_project_application_flow_spec.test.mjs` |

## Maintenance
- Update this document whenever a new E2E flow is added or an existing spec is renamed.
- Keep `TODOS.md` in sync so the “Write E2E tests for critical flows” milestone remains accurate.
- Reference this table in the QA Test Plan to cross-link automation and manual coverage.
