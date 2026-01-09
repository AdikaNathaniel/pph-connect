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

test('WorkersPage composes Add Worker dialog with WorkerForm', () => {
  assert.match(
    content,
    /import\s+\{\s*[^}]*WorkerForm[^}]*\}\s+from\s+'@\/components\/worker\/WorkerForm'/,
    'Expected WorkersPage to import WorkerForm component'
  );
  assert.match(
    content,
    /const\s+\{[^}]*refresh[^}]*\}\s*=\s*useWorkerSearch\(\)/,
    'Expected useWorkerSearch hook to expose refresh helper'
  );
  assert.match(
    content,
    /const\s+handleCreateWorker\s*=\s*useCallback\(\s*async\s*\(values:\s*WorkerFormValues\)/,
    'Expected WorkersPage to define handleCreateWorker submission handler'
  );
  assert.match(
    content,
    /supabase\s*\.\s*from\('workers'\)\s*\.insert\(\s*\[\s*\{\s*[^}]*created_by:\s*currentUserId[^}]*created_at:\s*timestamp[^}]*\}\s*\]\s*\)/,
    'Expected Supabase insert with audit fields'
  );
  assert.match(
    content,
    /toast\.success\(/,
    'Expected success toast on worker creation'
  );
  assert.match(
    content,
    /toast\.error\(/,
    'Expected error toast on worker creation failure'
  );
  assert.match(
    content,
    /setShowAddWorker\(false\)/,
    'Expected modal to close after successful creation'
  );
  assert.match(
    content,
    /<WorkerForm[^>]*mode="create"[^>]*onSubmit=\{handleCreateWorker\}/,
    'Expected Add Worker dialog to render WorkerForm in create mode'
  );
});
