import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const tablePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'WorkersTable.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'WorkersTable.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate WorkersTable.tsx');
  }
  return match;
})();

const content = readFileSync(tablePath, 'utf8');

test('WorkersTable exposes loading skeleton and refined empty state', () => {
  assert.match(content, /import\s+\{\s*Skeleton\s*\}\s+from\s+'@\/components\/ui\/skeleton'/, 'Expected Skeleton import');
  assert.match(content, /isLoading\?:\s*boolean/, 'Expected isLoading prop');
  assert.match(
    content,
    /if\s*\(\s*isLoading\s*\)\s*\{/,
    'Expected conditional block that renders skeleton rows'
  );
  assert.match(
    content,
    /<Skeleton\s+className=/,
    'Expected skeleton usage in table rows'
  );
  assert.match(
    content,
    /No workers match your filters/,
    'Expected descriptive empty state message'
  );
});
