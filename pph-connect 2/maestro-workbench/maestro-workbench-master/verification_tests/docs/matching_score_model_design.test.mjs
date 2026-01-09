import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'matching-score-model.md'),
    path.join(process.cwd(), 'Reference Docs', 'matching-score-model.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate matching-score-model.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Matching score doc covers features, target, training, and assignment usage', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /features/i, 'Expected features section');
  assert.match(content, /target/i, 'Expected target description');
  assert.match(content, /train|training/i, 'Expected training plan');
  assert.match(content, /assignment|ranking/i, 'Expected assignment usage details');
});
