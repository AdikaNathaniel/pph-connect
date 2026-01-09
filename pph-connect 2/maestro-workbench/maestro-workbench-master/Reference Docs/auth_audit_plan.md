# Authentication Audit Plan

## Password Reset Security
- Ensure Supabase Auth emails include short-lived tokens (verify expiration and single-use enforcement).
- Manual test: request password reset for worker → confirm link invalid after use and that password change rotates refresh tokens.
- Negative test: attempt to reuse reset link; expect Supabase returns `expired_token`.
- Confirm that reset emails suppress user existence (i.e., call returns success even for unknown email) to prevent enumeration.

## Session Expiration
- Validate access token expiry by inspecting `supabase.auth.getSession()` and forcing refresh after `expires_at`.
- Automated idea: Playwright script signs in, manipulates `expires_at` in local storage, ensures API calls rerun with refresh token.
- Check server policies for refresh token TTL (default 24h) and document expectation for admins vs workers.

## Logout Validation
- Ensure `AuthContext.logout()` removes access + refresh tokens from local storage and hits `supabase.auth.signOut()`.
- Manual test: open two tabs, log out in one, verify other tab receives `SIGNED_OUT` event.
- Confirm protected routes redirect to `/` when session missing (both worker + manager).
- Ensure session cookies (if any) are not used; only JWT stored in storage to reduce CSRF risk.

References: Supabase Auth docs, `src/contexts/AuthContext.tsx` implementation, and Playwright scenarios for login/logout.
