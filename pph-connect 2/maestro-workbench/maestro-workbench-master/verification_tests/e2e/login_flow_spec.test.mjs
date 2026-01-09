import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'login.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'login.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('User login Playwright spec should exist with helper imports', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/login.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]User login/, 'Expected User login describe block');
});

test('Login spec waits for dashboard selectors', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /waitForSelector[^;]+worker-dashboard-summary-grid/, 'Expected wait for summary grid selector');
  assert.match(content, /expect\(page\.getByTestId\('worker-dashboard-summary-grid'\)\)\.toBeVisible/, 'Expected dashboard visibility assertion');
});
