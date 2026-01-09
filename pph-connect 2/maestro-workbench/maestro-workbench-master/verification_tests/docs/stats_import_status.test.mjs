import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'stats_import_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'stats_import_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Stats import status doc outlines pipeline, validation, and dashboards', () => {
  assert.ok(existsSync(docPath), 'Expected stats_import_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /runStatsImport/i, 'Expected runStatsImport mention');
  assert.match(content, /work_stats/i, 'Expected work_stats mention');
  assert.match(content, /rates_payable/i, 'Expected rates mention');
  assert.match(content, /validateStatsRows/i, 'Expected validation mention');
  assert.match(content, /Stats\.tsx/i, 'Expected manager stats page mention');
  assert.match(content, /WorkerEarnings|workerAnalyticsService/i, 'Expected worker-facing dashboard mention');
});
