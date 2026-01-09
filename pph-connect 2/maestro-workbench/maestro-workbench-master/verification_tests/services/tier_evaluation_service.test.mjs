import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

const logicPath = `file://${resolveModule('src/services/tierEvaluationLogic.ts')}`;
const logic = await import(logicPath);

test('tier evaluation logic exports promotion/demotion helpers', () => {
  assert.equal(typeof logic.checkPromotionEligibility, 'function');
  assert.equal(typeof logic.checkDemotion, 'function');
});
