import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'apply-project.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'apply-project.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Apply project Playwright spec should exist and import helpers', () => {
  assert.ok(existsSync(specPath), 'Expected e2e/flows/apply-project.spec.ts to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}\s+from\s+'\.\.\/support\/session';/, 'Expected helper import');
  assert.match(content, /createClient/, 'Expected Supabase admin client usage');
});

test('Apply project spec interacts with modal and submit button data test ids', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['available-project-card', 'available-project-apply', 'apply-confirmation-modal', 'apply-confirmation-submit'].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token} usage`);
  });
  assert.match(content, /Application submitted/, 'Expected toast assertion');
});
