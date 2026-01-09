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

test('WorkersTable renders pagination controls with summary and selector', () => {
  assert.match(
    content,
    /export\s+const\s+ROWS_PER_PAGE_OPTIONS\s*=\s*\[\s*10,\s*20,\s*50,\s*100\s*\]/,
    'Expected rows-per-page options constant'
  );
  assert.match(
    content,
    /\[\s*internalPage,\s*setInternalPage\s*\]\s*=\s*useState<number>\(/,
    'Expected internal page state'
  );
  assert.match(
    content,
    /\[\s*internalPageSize,\s*setInternalPageSize\s*\]\s*=\s*useState<number>\(/,
    'Expected internal page size state'
  );
  assert.match(
    content,
    /const\s+pageCount\s*=\s*Math\.max\(1,\s*Math\.ceil/,
    'Expected pageCount calculation'
  );
  assert.match(
    content,
    /Showing\s+\$\{startDisplay\}\s+to\s+\$\{endDisplay\}\s+of\s+\$\{totalRows\}\s+results/,
    'Expected results summary string'
  );
  assert.match(content, /Rows per page/, 'Expected rows-per-page label');
  assert.match(content, /SelectTrigger/, 'Expected Shadcn Select for page size');
  assert.match(
    content,
    /ROWS_PER_PAGE_OPTIONS\.map/,
    'Expected rows-per-page options rendered dynamically'
  );
  assert.match(content, /aria-label="Previous page"/, 'Expected previous page button');
  assert.match(content, /aria-label="Next page"/, 'Expected next page button');
});

test('WorkersTable supports server-driven pagination metadata', () => {
  assert.match(
    content,
    /const\s+applyClientPagination\s*=\s*page\s*===\s*undefined\s*&&\s*pageSize\s*===\s*undefined;/,
    'Expected flag to detect server pagination mode'
  );
  assert.match(
    content,
    /const\s+totalRows\s*=\s*totalCount\s*\?\?\s*filteredData\.length;/,
    'Expected total rows to prefer provided totalCount'
  );
  assert.match(
    content,
    /if\s*\(\s*!\s*applyClientPagination\s*\)\s*\{\s*return\s+filteredData;\s*\}/,
    'Expected server mode to return filtered rows without slicing'
  );
});
