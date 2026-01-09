import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const componentPath = resolvePath(['src', 'components', 'worker', 'ReplaceAccountModal.tsx']);

test('ReplaceAccountModal component exports expected API surface', () => {
  assert.ok(existsSync(componentPath), 'Expected ReplaceAccountModal.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /export\s+interface\s+ReplaceAccountModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+ReplaceAccountModal\b/, 'Expected named component export');
  assert.match(content, /export\s+default\s+ReplaceAccountModal\b/, 'Expected default export');
});

test('ReplaceAccountModal renders form fields and validation messaging', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /<Label[^>]*>\s*New Account Email\s*<\/Label>/, 'Expected email field label');
  assert.match(content, /data-testid="replace-account-email"/, 'Expected email input test id');
  assert.match(content, /data-testid="replace-account-id"/, 'Expected account id input test id');
  assert.match(content, /data-testid="replace-account-reason"/, 'Expected reason textarea test id');
  assert.match(content, /data-testid="replace-account-submit"/, 'Expected submit button test id');
  assert.match(
    content,
    /import\s+\{\s*showSuccessToast,\s*showErrorToast\s*\}\s+from\s+'@\/lib\/toast';/,
    'Expected toast helper imports'
  );
  assert.match(content, /showSuccessToast\(/, 'Expected success toast helper usage');
  assert.match(content, /showErrorToast\(/, 'Expected error toast helper usage');
});

test('ReplaceAccountModal performs Supabase update + insert operations', () => {
  const content = readFileSync(componentPath, 'utf8');

  assert.match(
    content,
    /supabase[\s\S]*\.from\('worker_accounts'\)[\s\S]*\.update/,
    'Expected update on worker_accounts table'
  );
  assert.match(
    content,
    /supabase[\s\S]*\.from\('worker_accounts'\)[\s\S]*\.insert/,
    'Expected insert on worker_accounts table'
  );
  assert.match(
    content,
    /is_current:\s*false/,
    'Expected update to mark old account as not current'
  );
  assert.match(
    content,
    /is_current:\s*true/,
    'Expected insert to mark new account as current'
  );
});
