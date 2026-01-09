# RLS Testing Plan

## Scope
This plan documents how we verify row-level security (RLS) for the key Supabase tables powering PPH Connect. Tests are executed with PostgREST requests using different API keys:
- **Service role key** (admin) to seed expectations.
- **Anon key** (unauthenticated) to ensure zero read/write access.
- **Role-specific JWTs** (manager, worker) generated via Supabase Auth for positive cases.

Tables under active coverage: `profiles`, `worker_applications`, `project_listings`, `project_listings`, `worker_assignments`, and phase 2 tables listed in future iterations.

## Non-Admin Write Tests
1. **profiles**: Attempt to update another user’s profile with a worker token. Expect 401/403.
2. **worker_applications**: Worker tries to insert application for another worker_id → rejected.
3. **project_listings**: Manager token can insert/update listings they created; worker tokens must fail.

Automation hooks:
- Extend `verification_tests/schema` to spin up Supabase clients with worker JWTs and assert `error.code === 'PGRST301'`.
- Document manual curl examples with headers `apikey: <anon>` and `Authorization: Bearer <worker_jwt>`.

## Unauthenticated Read Tests
- Using the anon key (no JWT), call `/rest/v1/worker_applications?select=id`. Expect 401.
- For public tables (e.g., `knowledge_base_articles` if intentionally public), confirm anon can read only those explicitly allowed.
- Record results in QA sheet each release.

## Role-Based Access (Phase 2)
- Managers should read/approve applications for their projects only. Use manager token tied to department to ensure cross-project access is blocked.
- Workers should only see their own applications (`eq=worker_id`).
- Future RBAC tables (phase 2) will add `role_permissions`; revisit once schema landed.

## Reference
- Existing automated coverage in `verification_tests/schema/*` ensures policies are applied via Supabase introspection.
- For manual validation, leverage the staging Supabase project and Postman collection `QA RLS Tests.postman_collection.json`.
