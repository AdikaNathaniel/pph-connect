import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'anomaly-detection-model.md'),
    path.join(process.cwd(), 'Reference Docs', 'anomaly-detection-model.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate anomaly-detection-model.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Anomaly detection doc covers data, features, model, and deployment', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /training data/i, 'Expected training data section');
  assert.match(content, /features/i, 'Expected features section');
  assert.match(content, /(model|architecture)/i, 'Expected model description');
  assert.match(content, /(deploy|endpoint)/i, 'Expected deployment plan');
});
