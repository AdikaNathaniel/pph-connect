# Worker Self-Service Portal Status

This doc outlines the worker-focused portal features: dashboard, onboarding, support, analytics.

## Dashboard & Unlock Progress

- `/w/dashboard` combines unlock progress, task suggestions, training reminders, and quality stats via `workerAnalyticsService` + `taskUnlockService`.
- Components: `WorkerDashboard`, `UnlockProgressCard`, `TaskSuggestions`, `BGCStatus` reminders.

## Onboarding & Training

- `/worker/onboarding` lists training modules assigned via `worker_training_assignments`, letting workers mark progress, view required gates, and launch training materials.
- Hooks/services: `useWorkerOnboarding`, `trainingAssignmentService`.

## Support & Knowledge Base

- `/support` (worker support tickets) lists personal tickets, links to KB articles, and offers escalation forms.
- `/help` (Knowledge Base) reuses `KnowledgeBase.tsx` to give workers search/filter access to docs.

## Analytics & Earnings

- `/worker/analytics` + `/worker/earnings` provide charts, earnings breakdowns, and quality comparisons using `workerAnalyticsService`, `balanceService`, and `rateService`.
- Workers can export CSVs of their earnings history, review rate card explanations, and compare against peer percentiles surfaced on the analytics page.
- The dedicated `worker_earnings` route exposes historical logs plus links to invoices, ensuring the self-service portal covers payouts without manager intervention.

## Tests

- Pages are covered by `verification_tests/pages/worker_dashboard_structure.test.mjs`, `worker_onboarding_structure.test.mjs`, `worker_knowledge_base_structure.test.mjs`, `worker_support_tickets_structure.test.mjs`, etc. to guarantee the portal stays functional.
