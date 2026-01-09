import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'WorkersPage.tsx'),
  path.join(process.cwd(), 'src', 'pages', 'manager', 'WorkersPage.tsx')
];

const workersPagePath = (() => {
  const match = candidatePaths.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate WorkersPage.tsx');
  }
  return match;
})();

const content = readFileSync(workersPagePath, 'utf8');

test('WorkersPage switches to client pagination when worker count is below threshold', () => {
  assert.match(
    content,
    /import\s+WorkersTable,\s*\{\s*WorkerRow,\s*CLIENT_FILTER_THRESHOLD,\s*DEFAULT_ROWS_PER_PAGE\s*\}\s+from\s+'\.\/WorkersTable';/,
    'Expected WorkersPage to import pagination constants from WorkersTable'
  );
  assert.match(
    content,
    /const\s+shouldUseServerPagination\s*=\s*serverQueryEnabled\s*&&\s*workersCount\s*>\s*CLIENT_FILTER_THRESHOLD/,
    'Expected server pagination guard based on threshold'
  );
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(!serverQueryEnabled\)\s*\{\s*return;\s*\}[\s\S]*if\s*\(\s*workersCount\s*>\s*0\s*&&\s*workersCount\s*<=\s*CLIENT_FILTER_THRESHOLD\s*\)\s*\{\s*const\s+desiredPageSize[\s\S]*setPageSize\([\s\S]*setPage\(/,
    'Expected effect to reset pagination when below threshold'
  );
});

test('WorkersPage only passes server pagination props when needed', () => {
  assert.match(
    content,
    /const\s+totalWorkerCount\s*=\s*shouldUseServerPagination\s*\?\s*workersCount\s*:\s*tableData\.length;/,
    'Expected total count to switch between server and client sources'
  );
  assert.match(
    content,
    /const\s+tableIsLoading\s*=\s*shouldUseServerPagination\s*\?\s*isWorkersLoading\s*:\s*serverQueryEnabled\s*\?\s*isWorkersLoading\s*:\s*isSearching;/,
    'Expected shared loading state handling for table'
  );
  assert.match(
    content,
    /const\s+workersTableProps\s*=\s*shouldUseServerPagination\s*\?\s*\{\s*page,\s*pageSize,\s*onPageChange:\s*setPage,\s*onPageSizeChange:\s*setPageSize,\s*totalCount:\s*totalWorkerCount,\s*isLoading:\s*tableIsLoading\s*\}\s*:\s*\{\s*totalCount:\s*totalWorkerCount,\s*isLoading:\s*tableIsLoading\s*\};/,
    'Expected conditional object for WorkersTable props'
  );
  assert.ok(
    content.includes('{...workersTableProps}'),
    'Expected conditional props spread via workersTableProps'
  );
});

test('WorkersPage normalizes server pagination state', () => {
  assert.match(
    content,
    /useEffect\(\s*\(\)\s*=>\s*\{\s*if\s*\(!shouldUseServerPagination\)\s*\{\s*return;\s*\}[\s\S]*if\s*\(\s*pageSize\s*>\s*CLIENT_FILTER_THRESHOLD\s*\)\s*\{\s*setPageSize\(\s*DEFAULT_ROWS_PER_PAGE\s*\);\s*\}/,
    'Expected effect to reset oversized page size when using server pagination'
  );
  assert.match(
    content,
    /const\s+serverTotalPages\s*=\s*[\s\S]*Math\.ceil\(\s*workersCount\s*\/\s*Math\.max\(pageSize,\s*1\)\s*\)/,
    'Expected server pagination effect to calculate total pages'
  );
  assert.match(
    content,
    /if\s*\(\s*page\s*>\s*serverTotalPages\s*\)\s*\{\s*setPage\(serverTotalPages\);/,
    'Expected server pagination effect to clamp page index'
  );
});
