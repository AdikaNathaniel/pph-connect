import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'assign-worker.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'assign-worker.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Assign worker Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/assign-worker.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]Assign worker/, 'Expected describe block for assign worker flow');
});

test('Assign worker spec fills form and confirms toast', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['add-worker-dialog', 'workers-action-assign', 'workers-assign-dialog', 'workers-assign-save'].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} interaction`);
  });
  assert.match(content, /Assigned worker \$\{?/, 'Expected success toast assertion');
});
