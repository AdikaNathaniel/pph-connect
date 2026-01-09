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

test('WorkersTable exposes test ids for bulk selection checkboxes', () => {
  assert.match(
    content,
    /data-testid="workers-select-all"/,
    'Expected select-all checkbox to expose data-testid'
  );
  assert.match(
    content,
    /data-testid="workers-select-row"/,
    'Expected row selection checkbox to expose shared data-testid for testing'
  );
  assert.match(
    content,
    /const\s+selectedCount\s*=\s*table\.getSelectedRowModel\(\)\.flatRows\.length/,
    'Expected WorkersTable to compute selected row count'
  );
  assert.match(
    content,
    /data-testid="workers-selection-summary"/,
    'Expected selection summary element to expose data-testid'
  );
  assert.match(
    content,
    /{selectedCount}\s*\{\s*selectedCount === 1 \?\s*'worker'\s*:\s*'workers'\s*\}\s*selected/,
    'Expected selection summary to display count with pluralisation'
  );
  assert.match(
    content,
    /data-testid="workers-bulk-actions-trigger"/,
    'Expected bulk actions trigger to expose data-testid'
  );
  assert.match(content, /Update Status/, 'Expected bulk actions menu item for updating status');
  assert.match(content, /Assign to Project/, 'Expected bulk actions menu item for project assignment');
  assert.match(content, /Export Selected/, 'Expected bulk actions menu item for exporting selection');
  assert.match(content, /Delete Selected/, 'Expected bulk actions menu item for delete action');
  assert.match(
    content,
    /const\s+\[activeBulkAction,\s*setActiveBulkAction\]\s*=\s*useState<BulkAction \| null>\(/,
    'Expected WorkersTable to track the active bulk action'
  );
  assert.match(
    content,
    /const\s+\[isPerformingBulkAction,\s*setIsPerformingBulkAction\]\s*=\s*useState\(/,
    'Expected WorkersTable to track bulk action loading state'
  );
  assert.match(
    content,
    /const\s+\[bulkStatus,\s*setBulkStatus\]\s*=\s*useState\('active'\)/,
    'Expected WorkersTable to track bulk status selection'
  );
  assert.match(
    content,
    /const\s+statusOptions\s*=\s*useMemo\(/,
    'Expected WorkersTable to memoize available status options'
  );
  assert.match(
    content,
    /data-testid="bulk-update-status-confirm"/,
    'Expected status dialog confirm button to expose data-testid'
  );
  assert.match(
    content,
    /data-testid="bulk-assign-project-confirm"/,
    'Expected project assignment dialog confirm button to expose data-testid'
  );
  assert.match(
    content,
    /data-testid="bulk-delete-confirm"/,
    'Expected delete confirmation button to expose data-testid'
  );
});
