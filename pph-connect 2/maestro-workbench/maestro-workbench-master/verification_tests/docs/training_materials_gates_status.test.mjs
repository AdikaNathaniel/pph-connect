import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'training_materials_gates_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'training_materials_gates_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Training doc covers materials, assignments, gates, and tests', () => {
  assert.ok(existsSync(docPath), 'Expected training_materials_gates_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Training Materials/i, 'Missing materials section');
  assert.match(content, /training_materials/i, 'Expected training_materials mention');
  assert.match(content, /## Assignments/i, 'Missing assignments section');
  assert.match(content, /trainingAssignmentService|worker_training_assignments/i, 'Expected assignment mention');
  assert.match(content, /## Training Gates/i, 'Missing gates section');
  assert.match(content, /training_gates|taskUnlock/i, 'Expected gate mention');
  assert.match(content, /## Tests/i, 'Missing tests section');
  assert.match(content, /verification_tests/i, 'Expected verification tests mention');
});
