# Phase 2 RBAC Plan

This document describes the roadmap for evolving from the current admin-only enforcement to a full role-based access control model.

## Policy Structure

- Maintain a single helper `worker_has_role(_worker_id uuid, _roles text[])` for all policy checks.
- Each write policy should reference the helper, never hard-coded emails or `public.profiles`.
- Read policies default to `USING (true)` for authenticated users unless data sensitivity demands additional filters (e.g., worker-specific records).
- Encapsulate domain-specific business rules inside SQL policies rather than application code.

## Migration Plan

1. **Baseline Enumeration**  
   Introduce an enum `worker_role` covering `super_admin`, `admin`, `manager`, `team_lead`, `worker`.

2. **Worker Metadata Update**  
   Ensure `public.workers` has `worker_role` populated for every record. Build a one-off migration that maps former admin emails to `super_admin`.

3. **Policy Rewrite**  
   Iteratively update each table to use `worker_has_role`. Add targeted tests similar to `verification_tests/schema/admin_rls.test.mjs`.

4. **Application Sync**  
   Expose the role via the AuthContext (`isAdmin`, role string) so UI can conditionally render functionality.

5. **Cleanup**  
   Remove any residual references to `public.profiles.role` once confidence is high.

## Role Hierarchy

- `super_admin` – full access, including schema migrations and emergency overrides.
- `admin` – manage organizational entities (departments, projects, rates, workers).
- `manager` – read/write access limited to projects and workers they oversee.
- `team_lead` – read-only access to departmental data plus approval abilities on worker applications.
- `worker` – read-only access to their own data, limited write access (e.g., updating profile preferences).

Each higher role inherits permissions from those below. Policies should use arrays like `ARRAY['super_admin','admin']` to capture inheritance. Tests must ensure demoted accounts lose write abilities immediately after role updates.
