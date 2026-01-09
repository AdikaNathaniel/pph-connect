import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'FilterBar.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'FilterBar.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate FilterBar.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('FilterBar exports expected API', () => {
  assert.match(content, /export\s+interface\s+FilterBarFilter/, 'Expected FilterBarFilter type export');
  assert.match(content, /export\s+interface\s+FilterBarProps/, 'Expected FilterBarProps interface export');
  assert.match(content, /export\s+const\s+FilterBar/, 'Expected FilterBar component export');
});

test('FilterBar renders add/clear controls with handlers', () => {
  assert.match(content, /import\s+\{\s*Button\s*\}\s+from '@\/components\/ui\/button'/, 'Expected Button import');
  assert.match(content, /data-testid="filterbar-add"/, 'Expected add filter button test id');
  assert.match(content, /onClick=\{onAddFilter\}/, 'Expected onAddFilter handler');
  assert.match(content, /data-testid="filterbar-clear"/, 'Expected clear all button test id');
  assert.match(content, /onClick=\{onClearAll\}/, 'Expected onClearAll handler');
  assert.match(content, /disabled=\{filters\.length === 0\}/, 'Expected clear button disabled when no filters');
});

test('FilterBar displays filter count and chips', () => {
  assert.match(content, /import\s+\{\s*Badge\s*\}\s+from '@\/components\/ui\/badge'/, 'Expected Badge import for count');
  assert.match(content, /data-testid="filterbar-count"/, 'Expected filter count badge test id');
  assert.match(content, /filters\.map/, 'Expected filters array mapping');
  assert.match(content, /ActiveFilterChip/, 'Expected ActiveFilterChip usage');
  assert.match(content, /onFilterClick\?\.\(filter\.id\)/, 'Expected chip click handler');
  assert.match(content, /onRemoveFilter/, 'Expected remove handler prop usage');
});
