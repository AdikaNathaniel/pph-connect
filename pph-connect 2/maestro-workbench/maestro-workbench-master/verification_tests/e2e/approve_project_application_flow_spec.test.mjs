import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveSpec = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'e2e', 'flows', 'approve-project-application.spec.ts'),
    path.join(process.cwd(), 'e2e', 'flows', 'approve-project-application.spec.ts'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const specPath = resolveSpec();

test('Approve project application spec should exist with helper imports', () => {
  assert.ok(existsSync(specPath), 'Expected approve project application spec to exist');
  const content = readFileSync(specPath, 'utf8');
  assert.match(content, /import\s+\{\s*loginAs,\s*navigateToApp\s*\}/, 'Expected helper import');
  assert.match(content, /createClient/, 'Expected Supabase admin client usage');
});

test('Approve project application spec targets card + approve button test ids', () => {
  assert.ok(existsSync(specPath));
  const content = readFileSync(specPath, 'utf8');
  ['project-application-card', 'project-application-approve'].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token} in spec`);
  });
  assert.match(content, /Application approved/, 'Expected approval toast assertion');
});
