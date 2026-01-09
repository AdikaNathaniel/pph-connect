import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'rbac_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'rbac_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('RBAC status doc covers roles, RLS, UI gating, and tests', () => {
  assert.ok(existsSync(docPath), 'Expected rbac_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /user_role/i, 'Expected user_role mention');
  assert.match(content, /worker_has_role|can_message_user/i, 'Expected helper mention');
  assert.match(content, /RLS/i, 'Expected RLS mention');
  assert.match(content, /ProtectedRoute|hasRole/i, 'Expected UI gating mention');
  assert.match(content, /verification_tests\/schema|app|components/i, 'Expected verification tests mention');
});
