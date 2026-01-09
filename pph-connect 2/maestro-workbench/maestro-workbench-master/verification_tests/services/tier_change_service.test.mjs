import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const logicPath = resolvePath('src', 'services', 'tierEvaluationLogic.ts');
const servicePath = resolvePath('src', 'services', 'tierChangeService.ts');

test('Tier evaluation files exist', () => {
  assert.ok(existsSync(logicPath));
  assert.ok(existsSync(servicePath));
});
