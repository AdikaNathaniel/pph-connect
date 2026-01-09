import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'load_testing_plan.md'),
    path.join(process.cwd(), 'Reference Docs', 'load_testing_plan.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

test('Load testing plan documents scenarios, tooling, and metrics', () => {
  const docPath = resolveDoc();
  assert.ok(existsSync(docPath), 'Expected load_testing_plan.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Scenarios/i, 'Missing Scenarios section');
  assert.match(content, /## Tooling/i, 'Missing Tooling section');
  assert.match(content, /k6/i, 'Expected k6 mention');
  assert.match(content, /100\+?\s+concurrent/i, 'Expected 100 concurrent user target');
  assert.match(content, /## Metrics & Thresholds/i, 'Missing metrics section');
});
