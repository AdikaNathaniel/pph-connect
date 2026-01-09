import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const selectionPath = path.join(
  process.cwd(),
  'maestro-workbench',
  'maestro-workbench-master',
  'src',
  'lib',
  'projectSelection.ts'
);

test('projectSelection enforces training gate checks', () => {
  const content = readFileSync(selectionPath, 'utf8');

  assert.match(content, /requires_training_gate/i, 'Expected projects to track gate requirement flag');
  assert.match(
    content,
    /from\('training_gates'\)[\s\S]+eq\('worker_id'/i,
    'Expected query to check training_gates table for worker/project'
  );
  assert.match(
    content,
    /gateRequired\s+&&\s+!gatesPassed\s+\?\s*'training_required'/i,
    'Expected reason meta to reflect gate blocking'
  );
});
