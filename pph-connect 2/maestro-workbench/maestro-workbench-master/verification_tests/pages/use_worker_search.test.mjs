import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const hookPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'hooks', 'useWorkerSearch.ts'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'hooks', 'useWorkerSearch.ts')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate useWorkerSearch.ts');
  }
  return match;
})();

const content = readFileSync(hookPath, 'utf8');

test('useWorkerSearch defines debounced Supabase query across columns', () => {
  assert.match(content, /export\s+const\s+useWorkerSearch/, 'Expected hook export');
  assert.match(content, /setTimeout\([\s\S]*=>\s*setDebouncedQuery/, 'Expected debounce timeout');
  assert.match(content, /300/, 'Expected 300ms debounce value');
  assert.match(content, /supabase\s*\.\s*from\('workers'\)/, 'Expected workers table query');
  assert.match(content, /const\s+searchFilter\s*=\s*sanitized\s*\?/, 'Expected filter array definition');
  assert.match(content, /full_name\.ilike/, 'Expected full_name search condition');
  assert.match(content, /resultsLimit/, 'Expected results limit constant');
  assert.match(content, /return \{[\s\S]*query,/, 'Expected hook to return query state');
  assert.match(content, /return\s+\{\s*[\s\S]*refresh[\s\S]*\}/, 'Expected refresh helper to be returned');
});

test('useWorkerSearch exposes clear helper and loading flags', () => {
  assert.match(content, /const\s+clearQuery\s*=\s*useCallback/, 'Expected clearQuery helper');
  assert.match(content, /isSearching/, 'Expected isSearching flag');
  assert.match(content, /setIsSearching\(true\)/, 'Expected search start state');
  assert.match(content, /setIsSearching\(false\)/, 'Expected search completion state');
  assert.match(content, /const\s+refresh\s*=\s*useCallback/, 'Expected refresh callback definition');
});
