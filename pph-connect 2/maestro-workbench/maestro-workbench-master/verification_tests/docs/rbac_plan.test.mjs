import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'Reference Docs', 'rbac-plan.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'rbac-plan.md')
].filter((candidate) => existsSync(candidate));

if (candidatePaths.length === 0) {
  throw new Error('Could not locate Reference Docs/rbac-plan.md');
}

const docPath = candidatePaths[0];

function readDoc() {
  return readFileSync(docPath, 'utf8');
}

test('RBAC plan outlines policy structure, migration, and hierarchy', () => {
  const content = readDoc();

  assert.match(content, /Policy Structure/i, 'Expected policy structure section');
  assert.match(content, /Migration Plan/i, 'Expected migration plan section');
  assert.match(content, /Role Hierarchy/i, 'Expected role hierarchy definition');
});
