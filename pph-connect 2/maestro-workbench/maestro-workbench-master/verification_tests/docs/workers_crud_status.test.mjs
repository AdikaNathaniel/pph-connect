import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'workers_crud_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'workers_crud_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Workers CRUD status doc references directory, form, and removal flows', () => {
  assert.ok(existsSync(docPath), 'Expected workers_crud_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Worker Directory/i, 'Missing worker directory section');
  assert.match(content, /WorkersPage\/WorkersTable/i, 'Expected WorkersPage reference');
  assert.match(content, /WorkersTable/i, 'Expected WorkersTable mention');
  assert.match(content, /supabase\.from\('workers'\)/i, 'Expected workers query mention');

  assert.match(content, /## Create \& Update Flow/i, 'Missing create/update section');
  assert.match(content, /WorkerForm/i, 'Expected WorkerForm reference');
  assert.match(content, /insert\(\.\.\.\)|update\(\.\.\.\)/i, 'Expected Supabase insert/update mention');
  assert.match(content, /WorkerDetail/i, 'Expected WorkerDetail reference');

  assert.match(content, /## Removal/i, 'Missing removal section');
  assert.match(content, /offboardingService/i, 'Expected offboarding service reference');
  assert.match(content, /RemoveAssignmentModal/i, 'Expected removal modal mention');

  assert.match(content, /Saved Views/i, 'Expected saved views section mention');
  assert.match(content, /localStorage/i, 'Expected persistence mention');
});
