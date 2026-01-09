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

test('WorkersTable supports client-side filtering for small datasets', () => {
  assert.match(content, /export\s+type\s+WorkersTableFilters/, 'Expected WorkersTableFilters type export');
  assert.match(
    content,
    /export\s+const\s+CLIENT_FILTER_THRESHOLD\s*=\s*500/,
    'Expected CLIENT_FILTER_THRESHOLD constant'
  );
  assert.match(
    content,
    /filters\?:\s*WorkersTableFilters/,
    'Expected WorkersTable to receive filters prop'
  );
  assert.match(
    content,
    /const\s+shouldFilterClientSide\s*=\s*memoizedData\.length\s*<=\s*CLIENT_FILTER_THRESHOLD/,
    'Expected flag for client-side filtering threshold'
  );
  assert.match(
    content,
    /const\s+filteredData\s*=\s*useMemo/,
    'Expected filteredData memoization'
  );
  assert.match(
    content,
    /shouldFilterClientSide\s*&&\s*filters/,
    'Expected client filtering to depend on filters being present'
  );
  assert.match(
    content,
    /memoizedData\.filter/,
    'Expected filteredData to derive from memoizedData.filter'
  );
  assert.match(
    content,
    /const\s+visibleRows\s*=\s*useMemo\([\s\S]*filteredData\.slice/,
    'Expected visibleRows memoization to slice filtered data'
  );
  assert.match(
    content,
    /useReactTable\(\{\s*[\s\S]*data:\s*visibleRows/,
    'Expected table to consume paginated filtered rows'
  );
});
