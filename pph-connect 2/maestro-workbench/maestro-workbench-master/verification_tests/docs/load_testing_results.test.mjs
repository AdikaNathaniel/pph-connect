import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const summaryPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'test-results', 'perf', '2025-11-22-load-tests', 'summary.md'),
    path.join(process.cwd(), 'test-results', 'perf', '2025-11-22-load-tests', 'summary.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Load testing summary captures metrics and blockers', () => {
  assert.ok(existsSync(summaryPath), 'Expected load testing summary to exist');
  const content = readFileSync(summaryPath, 'utf8');

  assert.match(content, /## Metrics/i, 'Missing Metrics section');
  assert.match(content, /p95/i, 'Expected percentile mention');
  assert.match(content, /error rate/i, 'Expected error rate mention');
  assert.match(content, /Blocked/i, 'Expected blocker note');
});
