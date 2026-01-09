import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'filters', 'ActiveFilterChip.tsx'),
    path.join(process.cwd(), 'src', 'components', 'filters', 'ActiveFilterChip.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate ActiveFilterChip.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('ActiveFilterChip exports expected API', () => {
  assert.match(content, /export\s+interface\s+ActiveFilterChipProps/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+ActiveFilterChip/, 'Expected component export');
});

test('ActiveFilterChip renders label and optional description', () => {
  assert.match(content, /label:\s*string/, 'Expected label prop definition');
  assert.match(content, /description\?:\s*string/, 'Expected optional description prop');
  assert.match(content, /data-testid="active-filter-chip"/, 'Expected wrapper test id');
  assert.match(
    content,
    /\{\s*description\s*\?\s*\(\s*<span className="text-xs text-primary\/70">/,
    'Expected conditional description rendering'
  );
});

test('ActiveFilterChip wires click and remove handlers', () => {
  assert.match(content, /onClick\?:\s*\(\)\s*=>\s*void/, 'Expected optional onClick prop');
  assert.match(content, /onRemove:\s*\(\)\s*=>\s*void/, 'Expected onRemove prop');
  assert.match(content, /button\s+type="button"/, 'Expected clickable wrapper');
  assert.match(content, /data-testid="active-filter-remove"/, 'Expected remove button test id');
});
