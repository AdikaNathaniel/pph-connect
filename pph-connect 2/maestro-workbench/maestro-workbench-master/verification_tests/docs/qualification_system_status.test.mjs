import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'qualification_system_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'qualification_system_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Qualification system doc covers schema, services, UI, and tests', () => {
  assert.ok(existsSync(docPath), 'Expected qualification_system_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /skill_assessments|worker_skills/i, 'Expected schema mention');
  assert.match(content, /qualificationService|taskUnlockService/i, 'Expected service mention');
  assert.match(content, /Worker Detail|Project creation/i, 'Expected UI mention');
  assert.match(content, /verification_tests/i, 'Expected verification tests mention');
});
