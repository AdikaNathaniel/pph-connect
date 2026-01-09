# RBAC Status

This doc outlines how role-based access control (RBAC) is configured across Supabase schema, Auth context, and UI.

## Roles & Metadata

- Supabase custom roles: `user_role` enum (`root`, `admin`, `manager`, `team_lead`, `worker`). Worker accounts store `role` in `profiles`/`workers`, and `AuthProvider` syncs normalized roles back to Supabase auth metadata via `supabase.auth.updateUser({ data: { role } })`.
- `.supabase/migrations/*` add RLS helpers (`worker_has_role()`, `can_message_user()`) so SQL policies reference logical roles instead of raw IDs.

## RLS Policies

- Every core table (`workers`, `projects`, `training_*`, `messaging_*`, `invoice_*`) enables row-level security and restricts write access to admins/managers while allowing authenticated reads as appropriate.
- Messaging, training, and analytics tables import shared policies from `supabase/migrations/20251029*` and `20251106*`, aligning Maestro + PPH Connect behavior.

## Application Layer

- `ProtectedRoute` enforces role gating for React routes (`requiredRole="manager"`, etc.).
- Hooks like `useAuth` expose `isAdmin`, `hasRole`, and helper utilities (`hasRole(user.role, 'manager')`) to render actions conditionally.
- Critical UI (manager dashboards, admin settings, worker portals) branch on these helpers before rendering sensitive actions.

## Verification

- Schema tests (`verification_tests/schema/admin_rls.test.mjs`, `verification_tests/schema/projects.test.mjs`, …) validate RLS statements.
- App/component tests (`verification_tests/app/auth_context.test.mjs`, `verification_tests/components/protected_route.test.mjs`) assert role metadata sync + route gating logic.
