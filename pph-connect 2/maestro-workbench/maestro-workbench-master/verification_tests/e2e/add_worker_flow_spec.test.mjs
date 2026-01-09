import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'add-worker.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'add-worker.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Add worker Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/add-worker.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]Add worker/, 'Expected describe block for Add worker');
});

test('Add worker spec fills form and waits for table row', () => {
  assert.ok(existsSync(specPath), 'Expected add worker spec file to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /getByRole\(\s*'button',\s*\{\s*name:\s*\/add worker/i, 'Expected Add Worker button interaction');
  assert.match(content, /getByTestId\('worker-form-submit'\)/, 'Expected worker form submission');
  assert.match(content, /getByRole\(\s*'cell',\s*\{\s*name:\s*uniqueName/, 'Expected table assertion with unique name');
});
