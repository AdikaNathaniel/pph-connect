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

test('WorkersTable defines navigation-based action handlers', () => {
  assert.match(content, /useNavigate/, 'Expected WorkersTable to import useNavigate');
  assert.match(content, /const\s+navigate\s*=\s*useNavigate\(\)/, 'Expected navigate hook initialization');
  assert.match(content, /data-testid="workers-action-view"/, 'Expected view action test id');
  assert.match(content, /handleViewWorker\(row\.original\)/, 'Expected view action to call handler');
  assert.match(
    content,
    /navigate\(`\/manager\/workers\/\$\{worker\.id\}`\)/,
    'Expected view handler to navigate to worker details'
  );
  assert.match(content, /data-testid="workers-action-manage-accounts"/, 'Expected manage accounts action test id');
  assert.match(
    content,
    /navigate\(`\/manager\/workers\/\$\{worker\.id\}\?tab=accounts`\)/,
    'Expected manage accounts handler to navigate to accounts tab'
  );
});

test('WorkersTable exposes edit and assign actions through callbacks', () => {
  assert.match(content, /import\s+\{\s*MoreHorizontal,[^}]*UserCog/, 'Expected action icon imports');
  assert.match(content, /data-testid="workers-action-edit"/, 'Expected edit action test id');
  assert.match(content, /onEditWorker\?\.*/, 'Expected optional edit callback usage');
  assert.match(content, /data-testid="workers-action-assign"/, 'Expected assign action test id');
  assert.match(content, /openAssignWorker\(row\.original\)/, 'Expected assign action to capture worker');
  assert.match(content, /data-testid="workers-assign-dialog"/, 'Expected assign dialog test id');
});
