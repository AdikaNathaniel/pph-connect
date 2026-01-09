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

test('WorkersPage opens edit dialog and loads worker details', () => {
  assert.match(
    content,
    /const\s+\[showEditWorker,\s*setShowEditWorker\]\s*=\s*useState\(false\)/,
    'Expected state for edit modal visibility'
  );
  assert.match(
    content,
    /const\s+\[editingWorkerId,\s*setEditingWorkerId\]\s*=\s*useState<string\s*\|\s*null>\(null\)/,
    'Expected state to track editing worker id'
  );
  assert.match(
    content,
    /const\s+\[editFormValues,\s*setEditFormValues\]\s*=\s*useState<WorkerFormValues\s*\|\s*null>\(null\)/,
    'Expected state to store WorkerForm initial values'
  );
  assert.match(
    content,
    /const\s+\[isLoadingEditWorker,\s*setIsLoadingEditWorker\]\s*=\s*useState\(false\)/,
    'Expected state to track edit modal loading'
  );
  assert.match(
    content,
    /const\s+handleOpenEditWorker\s*=\s*useCallback\(\s*async\s*\(worker:\s*WorkerRow\)/,
    'Expected handleOpenEditWorker callback definition'
  );
  assert.match(
    content,
    /supabase\s*\.\s*from\('workers'\)\s*\.select\([\s\S]*locale_all[\s\S]*\)\s*\.eq\('id',\s*worker\.id\)\.single\(\)/,
    'Expected Supabase query to load worker details'
  );
  assert.match(
    content,
    /setShowEditWorker\(true\)/,
    'Expected edit modal to open after initiating load'
  );
  assert.match(
    content,
    /setEditFormValues\(\{\s*hrId:\s*data\.hr_id.*status:\s*data\.status[\s\S]*\}\)/,
    'Expected loaded worker to map into WorkerFormValues'
  );
  assert.match(
    content,
    /toast\.error\('Unable to load worker'/,
    'Expected toast on load failure'
  );
});

test('WorkersPage updates worker via WorkerForm in edit modal', () => {
  assert.match(
    content,
    /const\s+\[isUpdatingWorker,\s*setIsUpdatingWorker\]\s*=\s*useState\(false\)/,
    'Expected state to track edit submission'
  );
  assert.match(
    content,
    /const\s+handleUpdateWorker\s*=\s*useCallback\(\s*async\s*\(values:\s*WorkerFormValues\)/,
    'Expected handleUpdateWorker callback definition'
  );
  assert.match(
    content,
    /supabase\s*\.\s*from\('workers'\)\s*\.update\(\s*\{\s*[\s\S]*updated_by:\s*currentUserId[\s\S]*updated_at:\s*timestamp[\s\S]*\}\s*\)\s*\.eq\('id',\s*editingWorkerId\)/,
    'Expected Supabase update with audit fields'
  );
  assert.match(
    content,
    /toast\.success\('Worker updated'/,
    'Expected success toast after update'
  );
  assert.match(
    content,
    /toast\.error\('Unable to update worker'/,
    'Expected error toast on update failure'
  );
  assert.match(
    content,
    /refresh\(\)/,
    'Expected search results refresh after update'
  );
  assert.match(
    content,
    /<DialogContent\s+data-testid="edit-worker-dialog">[\s\S]*<WorkerForm[\s\S]*mode="update"[\s\S]*initialValues=\{editFormValues\}[\s\S]*onSubmit=\{handleUpdateWorker\}[\s\S]*onCancel=\{handleCloseEditWorker\}[\s\S]*isSubmitting=\{isUpdatingWorker\}[\s\S]*\/>/,
    'Expected edit dialog to render WorkerForm in update mode'
  );
});

test('WorkersTable notifies WorkersPage when edit action selected', () => {
  assert.match(
    content,
    /<WorkersTable[^>]*onEditWorker=\{handleOpenEditWorker\}/,
    'Expected WorkersTable to receive edit callback'
  );
});
