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

test('WorkersTable exports component using TanStack table utilities', () => {
  assert.match(content, /import\s+\{[^}]*useReactTable/, 'Expected TanStack useReactTable import');
  assert.match(content, /createColumnHelper/, 'Expected column helper import');
  assert.match(content, /getSortedRowModel/, 'Expected getSortedRowModel import');
  assert.match(content, /export\s+const\s+WorkersTable/, 'Expected WorkersTable export');
  assert.match(content, /useReactTable\(/, 'Expected useReactTable invocation');
  assert.match(content, /useState<[^>]*>/, 'Expected WorkersTable to manage local state');
  assert.match(content, /Table,\s*TableBody,\s*TableCell,\s*TableHead,\s*TableHeader,\s*TableRow/, 'Expected Shadcn Table components');
  assert.match(content, /StatusBadge/, 'Expected StatusBadge import');
  assert.match(content, /BGCStatusIcon/, 'Expected BGCStatusIcon import');
});

test('WorkersTable defines required column definitions', () => {
  assert.match(content, /columnHelper\.display\([^)]*id:\s*'select'/s, 'Expected select column');
  assert.match(content, /columnHelper\.accessor\('hr_id'/, 'Expected HR ID column');
  assert.match(content, /columnHelper\.accessor\('full_name'/, 'Expected full name column');
  assert.match(content, /columnHelper\.accessor\('status'/, 'Expected status column');
  assert.match(content, /columnHelper\.accessor\('current_email'/, 'Expected current email column');
  assert.match(
    content,
    /columnHelper\.accessor\('current_email'[\s\S]*header:\s*sortableHeader\('Current Email'\)/,
    'Expected current email column to use sortable header'
  );
  assert.match(content, /columnHelper\.accessor\('country'/, 'Expected country column');
  assert.match(content, /columnHelper\.accessor\('locale'/, 'Expected locale column');
  assert.match(content, /columnHelper\.accessor\('hire_date'/, 'Expected hire date column');
  assert.match(content, /columnHelper\.display\([^)]*id:\s*'bgcStatus'/s, 'Expected BGC status column');
  assert.match(content, /columnHelper\.display\([^)]*id:\s*'actions'/s, 'Expected actions column');
  assert.match(content, /column\.getToggleSortingHandler\(\)/, 'Expected sortable headers to use toggle handler');
  assert.match(content, /table\.getIsAllRowsSelected\(/, 'Expected select-all checkbox to reflect selection state');
  assert.match(content, /row\.getIsSelected\(/, 'Expected row selection state handling');
  assert.match(content, /<StatusBadge/, 'Expected status column to render StatusBadge');
  assert.match(content, /<BGCStatusIcon/, 'Expected BGC column to render BGCStatusIcon');
  assert.match(content, /DropdownMenu/, 'Expected actions column to use DropdownMenu');
});

test('WorkersTable renders memoized rows to avoid unnecessary re-renders', () => {
  assert.match(
    content,
    /const\s+WorkersTableRow\s*=\s*React\.memo\(/,
    'Expected WorkersTableRow to be wrapped with React.memo'
  );
  assert.match(
    content,
    /tableRows\.map\(\s*\(\s*row\s*\)\s*=>\s*\(\s*<WorkersTableRow\s+/,
    'Expected WorkersTable to render memoized row component'
  );
});

test('WorkersTableRow uses custom equality to minimize renders', () => {
  assert.match(
    content,
    /const\s+areWorkerRowsEqual\s*=\s*\(/,
    'Expected custom comparator to be defined'
  );
  assert.match(
    content,
    /React\.memo\(\s*\(\{\s*row\s*\}.*\),\s*areWorkerRowsEqual\)/s,
    'Expected React.memo to receive custom equality function'
  );
});
