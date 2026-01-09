# Authentication Status

This document tracks how authentication works across Maestro Workbench and how we gate routes for workers, managers, and admins.

## Landing Flow

- `/auth` and `/` render the `Landing` page, which doubles as the authentication entry point.
- The form invokes `supabase.auth.signInWithPassword({ email, password })`, raises toast feedback on failures, and routes managers to `/m/dashboard` or workers to `/w/dashboard` on success.
- Workers can also use the Google OAuth button (`GoogleOAuthButton`) if SSO is enabled, which calls Supabase OAuth providers via the client SDK.

## Auth Context

- `AuthProvider` listens to `supabase.auth.onAuthStateChange`, fetches the initial session via `supabase.auth.getSession()`, and loads the matching `profiles` row for the authenticated user.
- The context exposes `logout`, `refreshSession`, `isLoading`, `isAuthenticated`, `isAdmin`, and `error` so UI components can react to session changes.
- `refreshSession` calls `supabase.auth.refreshSession()` and re-fetches the worker profile to keep role data current.
- The provider normalizes roles via `normalizeRole` and syncs them back to the Supabase auth metadata using `supabase.auth.updateUser({ data: { role } })` so downstream RLS policies remain in sync.

## Protected Routes

- `ProtectedRoute` consumes `useAuth`/`useUser`, renders a loading fallback while `isLoading` is true, redirects unauthenticated visitors to `/auth`, and defers unauthorized users to their role-specific dashboards.
- Manager-only routes wrap their pages with `<ProtectedRoute requiredRole="manager">` (e.g., `/m/dashboard`), while admin pages use `requiredRole="admin"` and workers default to `requiredRole="worker"`.
- Every protected view includes the badge indicator (`data-testid="protected-route-badge"`) so we can verify who currently has access in QA runs.

## Password Enforcement

- New accounts ship with `initial_password_hash` set; until `password_changed_at` exists, `ProtectedRoute` forces the session to `/change-password` using the `passwordChangeRedirect` prop.
- The badge uses `hasRole` to show whether the active user has elevated privileges (`isAdmin` → "Admin access" badge).
- These rules are covered by `src/components/__tests__/ProtectedRoute.test.tsx`, which validates loading fallback, unauthenticated redirects, password enforcement, and role-based fallbacks.
