import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'rls_testing_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'rls_testing_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

const REQUIRED_SECTIONS = [
  '## Scope',
  '## Non-Admin Write Tests',
  '## Unauthenticated Read Tests',
  '## Role-Based Access \(Phase 2\)',
];

test('RLS testing plan documents scope and scenarios', () => {
  assert.ok(existsSync(docPath), 'Expected rls_testing_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(content, new RegExp(escaped), `Expected section ${section}`);
  });

  ['profiles', 'worker_applications', 'project_listings'].forEach((table) => {
    assert.match(content, new RegExp(table), `Expected mention of ${table}`);
  });

  assert.match(content, /anon key/i, 'Expected mention of unauthenticated (anon) key');
  assert.match(content, /service role/i, 'Expected mention of service role key for admin bypass');
});
