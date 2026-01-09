# Training Materials & Gates Status

This doc summarizes how training content, assignments, and gating logic work inside Maestro Workbench.

## Training Materials

- `TrainingModules` manager page (`/m/training`) queries `training_materials` and `training_module_tags` to list modules by domain/tier.
- Admins can upload links/files, tag modules, and set expert tier requirements; the UI writes back via `supabase.from('training_materials').insert/update`.

## Assignments & Access

- `trainingAssignmentService` + `onboardingWorkflowService` assign modules based on worker skills, tags, and domain requirements, inserting rows into `worker_training_assignments` and `worker_training_access`.
- `workerTrainingAssignments` page (`/worker/onboarding`) lets workers track progress—status is derived from `worker_training_assignments.status`, completion dates, and quiz scores.

## Training Gates

- Training gates live in `training_gates` (name, score thresholds) and `worker_training_progress` (per worker records). Workers must hit gate conditions before unlocking harder tasks.
- Task unlock logic (`taskUnlockService`, `taskUnlocking.ts`) checks gate completion + domain assessments before raising difficulty tiers.

## Tests & Verification

- Verification suites ensure schema + pages exist: `verification_tests/pages/worker_onboarding_structure.test.mjs`, `verification_tests/services/training_assignment_service.test.mjs`, `verification_tests/schema/training_gates.test.mjs`, etc.
- Together these systems satisfy “Training materials and gates functional” by covering content creation, worker assignments, and gate enforcement.
