import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

const assignmentSpecPath = resolvePath('tests', 'integration', 'api', 'assignmentWorkflow.test.ts');

test('Assignment workflow integration spec covers assignment lifecycle', () => {
  assert.ok(existsSync(assignmentSpecPath), 'Expected assignmentWorkflow.test.ts to exist');
  const content = readFileSync(assignmentSpecPath, 'utf8');
  assert.match(content, /Assignment Workflow API/, 'Expected suite title');
  assert.match(content, /link worker to project/i, 'Expected assignment creation coverage');
  assert.match(content, /record unassignment|remove assignment/i, 'Expected removal coverage');
  assert.match(content, /pull active assignments/i, 'Expected fetch coverage');
});
