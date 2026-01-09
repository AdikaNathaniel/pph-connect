import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const componentPath = resolvePath(['src', 'components', 'worker', 'RemoveAssignmentModal.tsx']);

test('RemoveAssignmentModal component exports expected API surface', () => {
  assert.ok(existsSync(componentPath), 'Expected RemoveAssignmentModal.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+RemoveAssignmentModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+RemoveAssignmentModal\b/, 'Expected named component export');
  assert.match(content, /export\s+default\s+RemoveAssignmentModal\b/, 'Expected default export');
});

test('RemoveAssignmentModal renders inputs and confirmation controls', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /<Label[^>]*>\s*Reason for removal\s*\(optional\)\s*<\/Label>/, 'Expected reason label');
  assert.match(content, /data-testid="remove-assignment-reason"/, 'Expected reason textarea test id');
  assert.match(content, /data-testid="remove-assignment-submit"/, 'Expected submit button test id');
  assert.match(
    content,
    /import\s+\{\s*showSuccessToast,\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helpers import'
  );
  assert.match(content, /showSuccessToast\(/, 'Expected success toast helper usage');
  assert.match(content, /showErrorToast\(/, 'Expected error toast helper usage');
});

test('RemoveAssignmentModal updates worker_assignments with removal metadata', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /supabase[\s\S]*\.from\('worker_assignments'\)[\s\S]*\.update/,
    'Expected Supabase update on worker_assignments table'
  );
  assert.match(content, /removed_at:\s*now/, 'Expected removed_at timestamp');
  assert.match(content, /removed_by:\s*userId/, 'Expected removed_by audit update');
  assert.match(content, /removal_reason:\s*reason\.trim\(\)\s*\|\|\s*null/, 'Expected removal_reason persistence');
});
