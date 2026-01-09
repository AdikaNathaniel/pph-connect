import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const workersPagePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'WorkersPage.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'WorkersPage.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate WorkersPage.tsx');
  }
  return match;
})();

const content = readFileSync(workersPagePath, 'utf8');

test('WorkersPage renders WorkersTable with search results', () => {
  assert.match(
    content,
    /import\s+WorkersTable,\s*\{\s*WorkerRow,\s*CLIENT_FILTER_THRESHOLD,\s*DEFAULT_ROWS_PER_PAGE\s*\}\s+from\s+'\.\/WorkersTable';/,
    'Expected WorkersPage to import WorkersTable with pagination constants'
  );
  assert.match(
    content,
    /const tableData = useMemo<WorkerRow\[]/,
    'Expected WorkersPage to memoize table data from search results'
  );
  assert.ok(
    content.includes('data={tableData}'),
    'Expected WorkersTable to receive table data prop'
  );
  assert.ok(
    content.includes('filters={searchFilters}'),
    'Expected WorkersTable to receive derived filters'
  );
  assert.ok(
    content.includes('{...workersTableProps}'),
    'Expected WorkersTable to spread conditional pagination props'
  );
});
