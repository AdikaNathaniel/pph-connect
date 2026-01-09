# Security Testing Plan

## SQL Injection Verification
- Use Supabase REST endpoints with crafted payloads (e.g., `' OR '1'='1`) against `worker_applications`, `project_listings`, `messages` tables. Expect 406 or filtered results when RLS + Param binding enforced.
- Validate server-side functions (`send-message` edge function) reject concatenated SQL by reviewing Supabase logs.
- Automation hook: add `curl` scripts under `scripts/security/sql_injection.sh` targeting staging REST endpoints with read-only API key.

## XSS Hardening
- Test rich-text fields (messaging composer, worker cover letters) by submitting `<script>alert('xss')</script>` and verifying output is sanitized (React escaping + Tiptap sanitization).
- Verify Markdown rendering (knowledge base) encodes HTML by default.
- Playwright scenario TODO: extend `send-message.spec.ts` to send malicious payload and assert the message renders as text.

## CSRF & Session Controls
- Supabase Auth uses JWT + `apikey` headers; CSRF risk minimized. Confirm fetch requests include `supabase.auth.getSession()` tokens only (no cookies).
- Ensure logout clears local storage tokens (`AuthContext.logout`).
- Manual test: attempt POST from another domain (using browser devtools) without JWT → expect 401.

## Insecure Direct Object References
- RLS already enforces access, but verify manually:
  - Worker tries to `PATCH /rest/v1/worker_applications?id=neq.<self>` with worker JWT → expect 401.
  - Manager tries to fetch projects they do not own via `/rest/v1/project_listings?project_id=neq.owned`. Confirm RLS filters results.
- Document Postman test cases referencing worker, manager, admin tokens.

## Findings & Follow-up
- Record security triage in `Notion > Security > Testing Log` with severity + owner.
- Link back to GitHub issues / Supabase policy changes when vulnerabilities discovered.
