import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'error-pattern-analysis.md'),
    path.join(process.cwd(), 'Reference Docs', 'error-pattern-analysis.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate error-pattern-analysis.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Error pattern analysis doc covers clustering, per-worker patterns, reports, and training recommendations', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /cluster/i, 'Expected clustering strategy');
  assert.match(content, /per-worker/i, 'Expected per-worker pattern section');
  assert.match(content, /report/i, 'Expected reporting plan');
  assert.match(content, /personalized training/i, 'Expected training recommendation section');
});
