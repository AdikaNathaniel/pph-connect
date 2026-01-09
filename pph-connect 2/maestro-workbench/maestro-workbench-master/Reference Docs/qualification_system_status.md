# Qualification System Status

This doc captures how worker qualifications are tracked and enforced.

## Schema & Data

- `skill_assessments`, `worker_skills`, `qualification_requirements`, and `worker_goals` tables store test attempts, verified skills, and target goals per worker.
- `project_listings.required_qualifications` references these identifiers so task listings can gate access.

## Services & Hooks

- `qualificationService` (and related hooks like `useWorkerQualifications`) fetch worker skill states, pass/fail thresholds, and recommended next steps.
- `taskUnlockService` consults qualifications + assessments before allowing a worker to apply to higher-tier projects.

## UI Surfaces

- Worker detail “Qualifications” tab shows assessment history + current status.
- Project creation wizard includes a qualifications selector to enforce requirements.
- Worker-facing gating warnings surface when required qualifiers are missing.

## Tests

- Verification suites such as `verification_tests/schema/skill_assessments.test.mjs`, `verification_tests/pages/worker_detail_structure.test.mjs`, and `verification_tests/services/task_unlock_service.test.mjs` ensure schema + UI + unlock logic stay in sync.
