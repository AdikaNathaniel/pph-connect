import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const tablePath = resolvePath(['src', 'pages', 'manager', 'ProjectsTable.tsx']);

test('ProjectsTable exposes pagination props and constants', () => {
  assert.ok(existsSync(tablePath), 'Expected ProjectsTable.tsx to exist');
  const content = readFileSync(tablePath, 'utf8');

  assert.match(content, /export\s+const\s+PROJECTS_ROWS_PER_PAGE_OPTIONS\s*=/, 'Expected rows-per-page constant');
  assert.match(
    content,
    /export\s+const\s+ProjectsTable[\s\S]*\(\{\s*data\s*=\s*\[\],\s*isLoading\s*=\s*false,\s*totalCount,\s*filters,\s*page,\s*pageSize,\s*onPageChange,\s*onPageSizeChange\s*\}\)/,
    'Expected ProjectsTable to destructure pagination props with defaults'
  );
  assert.match(
    content,
    /export\s+interface\s+ProjectsTableProps[\s\S]*page\?:\s*number;/,
    'Expected ProjectsTableProps to include page prop'
  );
  assert.match(
    content,
    /ProjectsTableProps[\s\S]*pageSize\?:\s*number;/,
    'Expected ProjectsTableProps to include pageSize prop'
  );
  assert.match(
    content,
    /onPageChange\?:\s*\(nextPage:\s*number\)\s*=>\s*void;/,
    'Expected ProjectsTableProps to include onPageChange handler'
  );
  assert.match(
    content,
    /onPageSizeChange\?:\s*\(nextSize:\s*number\)\s*=>\s*void;/,
    'Expected ProjectsTableProps to include onPageSizeChange handler'
  );
});

test('ProjectsTable renders pagination controls and action dropdown menu items', () => {
  const content = readFileSync(tablePath, 'utf8');

  assert.match(content, /const\s+\[internalPage,\s*setInternalPage\]\s*=\s*useState/, 'Expected internal page state');
  assert.match(content, /const\s+\[internalPageSize,\s*setInternalPageSize\]\s*=\s*useState/, 'Expected internal page size state');
  assert.match(
    content,
    /const\s+paginatedRows\s*=\s*useMemo/,
    'Expected memoized pagination slice'
  );
  assert.match(
    content,
    /data-testid="projects-pagination-prev"/,
    'Expected previous page button test id'
  );
  assert.match(
    content,
    /data-testid="projects-pagination-next"/,
    'Expected next page button test id'
  );
  assert.match(
    content,
    /data-testid="projects-pagination-size"/,
    'Expected rows-per-page select test id'
  );
  assert.match(
    content,
    /View details/,
    'Expected View details action'
  );
  assert.match(content, /Edit project/, 'Expected Edit project action');
  assert.match(content, /Archive/, 'Expected Archive action');
});
