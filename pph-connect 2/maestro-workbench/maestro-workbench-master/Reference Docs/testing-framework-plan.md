# Testing Framework Plan

## Framework Choice

- **Chosen framework:** Vitest (lightweight, Vite-native, matches existing tooling).
- Jest remains optional for legacy suites; however, new tests will use Vitest + React Testing Library.
- Vitest advantages: instant watch mode, TS-aware, easy Supabase client mocking with `vi.mock`.

## TypeScript Configuration

- Add `vitest.config.ts` at repo root, extending Vite config with test block.
- Update `tsconfig.node.json` references to include `vite.config.ts` + `vitest.config.ts` types.
- Ensure `paths` alias (`@/*`) works by reusing `tsconfig.app.json` paths.
- Use `setupTests.ts` file for globals (e.g., `vi.mock('@/integrations/supabase/client', ...)`).

## Test Utilities

- **Render helpers:** Create `test/utils/renderWithProviders.tsx` that wraps components in `AuthProvider`, `QueryClientProvider`, etc.
- **Supabase mocks:** Provide `createMockSupabaseClient()` returning spies for `.from()`/`.select()` combos used in components.
- **Data builders:** Add `factories/messageThreadFactory.ts` for consistent test data.
- **CI integration:** Add `"test": "vitest run"` script + `npm run test:watch`.

Next steps: implement config + setup files, migrate existing unit tests (utilities) to Vitest.
