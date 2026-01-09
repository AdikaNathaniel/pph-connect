# Core Tables Status

This document confirms that the seven foundational PPH Connect tables are implemented via Supabase migrations and have dedicated verification tests.

## Core Tables Status

| Table | Migration | Verification Test | Notes |
| --- | --- | --- | --- |
| `departments` | `supabase/migrations/20251106000000_update_departments_schema.sql` | `verification_tests/schema/departments.test.mjs` | Covers schema, indexes, and RLS policies. |
| `teams` | `supabase/migrations/20251106001000_create_teams_table.sql` | `verification_tests/schema/teams.test.mjs` | Verifies FK to departments and locale constraints. |
| `workers` | `supabase/migrations/20251106002000_create_workers_table.sql` | `verification_tests/schema/workers.test.mjs` | Ensures enums, unique constraints, and supervisor FK. |
| `worker_accounts` | `supabase/migrations/20251106003000_create_worker_accounts_table.sql` | `verification_tests/schema/worker_accounts.test.mjs` | Checks platform enum, partial unique constraint, and audit fields. |
| `projects` | `supabase/migrations/20251106004000_create_projects_table.sql` | `verification_tests/schema/projects.test.mjs` | Validates status/tier enums and department FK. |
| `project_teams` | `supabase/migrations/20251106005000_create_project_teams_table.sql` | `verification_tests/schema/project_teams.test.mjs` | Confirms junction uniqueness + cascade rules. |
| `worker_assignments` | `supabase/migrations/20251106006000_create_worker_assignments_table.sql` | `verification_tests/schema/worker_assignments.test.mjs` | Tests worker/project FKs, partial active index, and soft-delete columns. |

Run `node --test verification_tests/schema/{departments,teams,workers,worker_accounts,projects,project_teams,worker_assignments}.test.mjs` to validate the migrations whenever these tables change.
