import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'performance-thresholds.md'),
    path.join(process.cwd(), 'Reference Docs', 'performance-thresholds.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate performance-thresholds.md');
  }
  return match;
};

const docPath = resolveDoc();

test('Performance thresholds doc covers accuracy, rework, latency, and actions', () => {
  const content = readFileSync(docPath, 'utf8');
  assert.match(content, /accuracy/i, 'Expected accuracy threshold mention');
  assert.match(content, /rework/i, 'Expected rework limit mention');
  assert.match(content, /latency|SLA/i, 'Expected latency section');
  assert.match(content, /action|remove|retrain/i, 'Expected enforcement actions');
});
