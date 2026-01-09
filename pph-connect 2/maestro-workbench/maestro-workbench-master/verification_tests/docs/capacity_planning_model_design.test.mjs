import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'capacity-planning-model.md'),
    path.join(process.cwd(), 'Reference Docs', 'capacity-planning-model.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate capacity-planning-model.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Capacity planning doc covers demand, supply, gap prediction, and recommendations', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /demand/i, 'Expected demand forecasting section');
  assert.match(content, /supply/i, 'Expected supply forecasting section');
  assert.match(content, /gap/i, 'Expected gap prediction mention');
  assert.match(content, /recruitment|throttling/i, 'Expected recommendation section');
});
