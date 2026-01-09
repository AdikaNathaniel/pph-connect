# Supabase Auth Configuration

Follow this checklist whenever you provision a new Supabase project or refresh credentials locally.

## Environment Variables

Populate both `.env` and Supabase project secrets with the following values:

- `VITE_SUPABASE_URL` – Project API URL (`https://<project>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` – anon key for client requests
- `SUPABASE_SERVICE_ROLE_KEY` – service role key used by scripts/Edge Functions
- `SUPABASE_JWT_SECRET` – JWT secret from the Supabase dashboard
- `SUPABASE_REDIRECT_URL_APP` – app callback URL, e.g. `http://localhost:5173/auth/callback`
- `SUPABASE_REDIRECT_URL_DASHBOARD` – admin dashboard URL (production)

Commit only `.env.example`; never push real keys.

## Email Templates

1. Open Supabase Dashboard → **Authentication → Email templates**.
2. Update the **Confirm signup** template with the project branding and set the call-to-action to `${SUPABASE_REDIRECT_URL_APP}/confirm`.
3. Update the **Reset password** template to point to `${SUPABASE_REDIRECT_URL_APP}/reset`.
4. Enable the “Password recovery” toggle so reset emails are sent.

## Redirect URLs

In **Authentication → URL configuration** add:

- `http://localhost:5173/auth/callback`
- `https://app.pph-connect.com/auth/callback` (adjust for production)
- `https://dashboard.pph-connect.com/auth/callback` if using a separate admin SPA.

Ensure the magic link redirect matches your deployed domains before going live.

## Testing the Flow

Run through the three happy-path checks after updating credentials:

1. **Signup** – create a test user via the UI, confirm the email, ensure redirect works.
2. **Login** – sign in with the confirmed account, verify session persists across refresh.
3. **Password reset** – trigger “forgot password”, complete the flow, and confirm the new password works.

Record the test account credentials in the release QA notes and deactivate or delete the account afterwards.
