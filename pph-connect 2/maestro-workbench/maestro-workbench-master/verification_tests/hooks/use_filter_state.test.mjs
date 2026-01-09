import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const hookPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'hooks', 'useFilterState.ts'),
    path.join(process.cwd(), 'src', 'hooks', 'useFilterState.ts')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate useFilterState.ts');
  }
  return match;
})();

const content = readFileSync(hookPath, 'utf8');

test('useFilterState exports hook and types', () => {
  assert.match(content, /export\s+type\s+FilterKind/, 'Expected FilterKind type export');
  assert.match(content, /export\s+type\s+FilterDefinition/, 'Expected FilterDefinition type export');
  assert.match(content, /export\s+interface\s+UseFilterState/, 'Expected UseFilterState interface');
  assert.match(content, /export\s+const\s+useFilterState/, 'Expected useFilterState hook export');
});

test('useFilterState manages add, update, remove operations', () => {
  assert.match(content, /const\s+addFilter\s*=/, 'Expected addFilter implementation');
  assert.match(content, /const\s+updateFilter\s*=/, 'Expected updateFilter implementation');
  assert.match(content, /const\s+removeFilter\s*=/, 'Expected removeFilter implementation');
  assert.match(content, /current\.map/, 'Expected filters state mapping logic');
  assert.match(content, /setFilters\(/, 'Expected state setter invocation');
});

test('useFilterState converts filters to Supabase query fragments', () => {
  assert.match(content, /const\s+buildSupabaseQuery\s*=/, 'Expected query builder helper');
  assert.match(content, /dateFilterToSupabase/, 'Expected date conversion helper');
  assert.match(content, /textFilterToSupabase/, 'Expected text conversion helper');
  assert.match(content, /numberFilterToSupabase/, 'Expected number conversion helper');
  assert.match(
    content,
    /\(\)\s*=>\s*\(\{\s*filters,\s*addFilter,\s*updateFilter,\s*removeFilter,\s*buildSupabaseQuery\s*\}\)/,
    'Expected hook to return query builder'
  );
});
