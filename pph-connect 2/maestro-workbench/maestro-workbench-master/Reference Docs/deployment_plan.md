# Deployment Plan (AWS Amplify)

## Amplify Setup
1. In AWS console, search for **Amplify Hosting** and click *Get Started*.
2. Step: Connect GitHub repository (`pph-connect/maestro-workbench`) and authorize Amplify and authorize Amplify to read from `main` (and optional `develop`).
3. When prompted for the app root, set it to `maestro-workbench/maestro-workbench-master`.
4. Name the app `pph-connect-web` and select the default backend environment (not needed for Supabase).

## Build Configuration
Use Amplify’s auto-detected settings or add `amplify.yml` similar to:
```
version: 1
applications:
  - appRoot: maestro-workbench/maestro-workbench-master
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**
```
Environment variables (Amplify console → App settings → Environment variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENV` (optional)
- Any feature flags required by `src/lib/config.ts`

## Deployment Steps
1. Commit to `main` → Amplify auto-builds using Node LTS (Amplify default is 18/20).
2. Confirm build succeeds (`npm run build` → `dist`).
3. After deploy, open the Amplify preview URL and smoke test:
   - Verify Supabase auth works (check environment vars).
   - Test SPA routing by refreshing nested routes (404 should redirect to `index.html`).
4. Configure custom domain under Amplify → Domain management (optional). Ensure HTTPS is enabled (Amplify-managed certificate).
5. For branch deployments, add `develop` (staging) and `feature/*` in Amplify console for preview builds. Update `ci.yml` if needed.
6. Keep `Reference Docs/deployment_plan.md` in sync when Amplify steps change.
