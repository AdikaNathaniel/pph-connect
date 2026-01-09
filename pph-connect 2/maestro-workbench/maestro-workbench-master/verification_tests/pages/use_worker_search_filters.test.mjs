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

test('useWorkerSearch supports server-side filtering with filter state', () => {
  assert.match(content, /export\s+(interface|type)\s+WorkerSearchFilters/, 'Expected WorkerSearchFilters export');
  assert.match(
    content,
    /\[\s*filters,\s*setFilters\s*\]\s*=\s*useState/,
    'Expected filters state managed via useState'
  );
  assert.match(
    content,
    /const\s+normalizedFilters/,
    'Expected normalizedFilters helper for query building'
  );
  assert.match(
    content,
    /const\s+hasActiveFilters/,
    'Expected hasActiveFilters guard'
  );
  assert.match(
    content,
    /if\s*\(!debouncedQuery\s*&&\s*!hasActiveFilters\)/,
    'Expected fetch short-circuit when no search or filters'
  );
  assert.match(content, /\.in\('status'/, 'Expected Supabase query to filter by status');
  assert.match(content, /\.in\('country'/, 'Expected Supabase query to filter by country');
  assert.match(content, /\.in\('locale'/, 'Expected Supabase query to filter by locale');
  assert.match(
    content,
    /return\s+\{\s*[\s\S]*filters,\s*setFilters/,
    'Expected hook to expose filters and setter'
  );
  assert.match(
    content,
    /return\s+\{\s*[\s\S]*refresh/,
    'Expected hook to expose refresh helper'
  );
});
