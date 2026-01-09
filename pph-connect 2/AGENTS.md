# Repository Guidelines

## Project Structure & Module Organization
Work inside `maestro-workbench/maestro-workbench-master`. Feature screens sit in `src/pages/manager` and `src/pages/worker`, shared UI in `src/components`, and domain helpers in `src/lib` and `src/contexts`. Supabase migrations and edge functions live in `supabase/migrations` and `supabase/functions`; keep them in sync before touching production data. Assets belong in `public/`, and release SQL plus QA scripts reside in `verification_tests/` for deployment checks.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` for the Vite server (defaults to `http://localhost:5173`) with your `.env` Supabase credentials. `npm run build` emits production bundles, `npm run preview` smoke‑tests the dist output, `npm run lint` applies the ESLint + TypeScript rules, and `npm run version:update <semver> "<note>"` updates package metadata and `VERSION_HISTORY.md`.

Always interact with Git remotes over SSH (e.g., `git@github.com:…`) instead of HTTPS so credential helpers remain consistent across environments.

## Coding Style & Naming Conventions
Code is TypeScript-first with React 18 and Tailwind. Stick to two-space indentation, functional components, and Tailwind utilities (fallback to `App.css` only for globals). Export components in PascalCase, prefix hooks with `use`, and name files after their primary export. Keep newly introduced code files under 500 lines—split responsibilities earlier rather than later—and prioritize DRY, clean code, and single-responsibility refactors. Prefer the `@/` alias (mapped to `src/`) instead of deep relative chains, and run ESLint before sending reviews to catch unused imports or hook ordering issues.

## Testing Guidelines
Automated unit suites are not in place; lean on `verification_tests/` to validate schema and flows. Execute `bash verification_tests/check_migrations.sh` after editing migrations, and run `node verification_tests/verify_schema.js` to diff Supabase changes. Capture manual notes next to the SQL artifacts so we retain regression context until Jest or Playwright coverage is added.

## Commit & Pull Request Guidelines
History currently uses short imperative subjects (e.g., `init`); keep that tone, expanding to verbs such as `feat: add worker analytics filters`. Scope commits narrowly, reference Supabase migration IDs when relevant, and update `VERSION_HISTORY.md` whenever user-facing behavior shifts. Pull requests should describe the change, list affected routes or modules, link issues, include UI screenshots when applicable, and cite which verification scripts were run.

## Security & Configuration Tips
Copy `.env.example` to `.env`, populate Supabase credentials plus the initial admin bootstrap values, and keep the file local—`.gitignore` already blocks it. Supabase access tokens drive auth and edge functions, so rotate them promptly and document temporary overrides in the PR or deployment notes.
