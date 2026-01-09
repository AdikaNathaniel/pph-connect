import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'worker-self-service.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'worker-self-service.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Worker self-service Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/worker-self-service.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /test\.describe\(['"]Worker self-service/, 'Expected describe block for worker self-service flow');
});

test('Worker self-service spec checks dashboard and earnings test ids', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['worker-dashboard-summary-grid', 'worker-dashboard-quick-actions', 'worker-visibility-panel', 'worker-earnings-summary', 'worker-earnings-history'].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId} interaction`);
  });
});
