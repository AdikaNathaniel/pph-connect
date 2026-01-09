import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const modalPath = resolvePath(['src', 'components', 'project', 'AssignWorkersModal.tsx']);

test('AssignWorkersModal exports component contract', () => {
  assert.ok(existsSync(modalPath), 'Expected AssignWorkersModal.tsx to exist');
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /export\s+interface\s+AssignWorkersModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+AssignWorkersModal\b/, 'Expected named component export');
  assert.match(content, /export\s+default\s+AssignWorkersModal\b/, 'Expected default export');
});

test('AssignWorkersModal loads workers, filters, and supports multi-select', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(content, /useEffect/, 'Expected effect to load workers list');
  assert.match(content, /data-testid="assign-workers-filter-status"/, 'Expected status filter test id');
  assert.match(content, /data-testid="assign-workers-filter-team"/, 'Expected team filter test id');
  assert.match(content, /data-testid="assign-workers-filter-locale"/, 'Expected locale filter test id');
  assert.match(content, /Checkbox\s*[\s\S]*data-testid="assign-workers-select-toggle"/, 'Expected checkbox for worker selection');
  assert.match(content, /selectedWorkerIds\.includes/, 'Expected worker selection tracking');
  assert.match(
    content,
    /const\s+\[assignedWorkerIds,\s*setAssignedWorkerIds\]\s*=\s*useState<Set<string>>\(\(\)\s*=>\s*new Set\(\)\)/,
    'Expected state tracking of already assigned workers'
  );
  assert.match(
    content,
    /assignedWorkerIds\.has\(worker\.id\)/,
    'Expected filtering to exclude already assigned workers'
  );
  assert.match(
    content,
    /const\s+isAssigned\s*=\s*assignedWorkerIds\.has\(worker\.id\)/,
    'Expected helper flag for assigned worker rows'
  );
  assert.match(
    content,
    /disabled=\{isAssigned\}/,
    'Expected assigned workers to be disabled in UI'
  );
  assert.match(content, /data-testid="assign-workers-submit"/, 'Expected submit button test id');
});

test('AssignWorkersModal inserts worker_assignments records with audit metadata', () => {
  const content = readFileSync(modalPath, 'utf8');

  assert.match(
    content,
    /supabase\s*\.from\('worker_assignments'\)\s*\.insert/,
    'Expected insertion into worker_assignments table'
  );
  assert.match(
    content,
    /supabase\s*\.from\('worker_assignments'\)\s*\.select\(.*worker_id/,
    'Expected query to load existing project assignments'
  );
  assert.match(
    content,
    /\.eq\('project_id',\s*projectId\)/,
    'Expected assignment query scoped by project id'
  );
  assert.match(
    content,
    /\.is\('removed_at',\s*null\)/,
    'Expected assignment query to exclude removed workers'
  );
  assert.match(content, /assigned_at:\s*timestamp/, 'Expected assigned_at timestamp');
  assert.match(content, /assigned_by:\s*userId/, 'Expected assigned_by audit field');
  assert.match(
    content,
    /import\s+\{\s*showSuccessToast,\s*showErrorToast(?:,\s*showInfoToast\s*)?\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper imports'
  );
  assert.match(content, /showSuccessToast\(/, 'Expected success toast helper');
  assert.match(content, /showErrorToast\(/, 'Expected error toast helper');
  assert.match(content, /onSuccess\?\.\(\)/, 'Expected onSuccess callback invocation');
});
