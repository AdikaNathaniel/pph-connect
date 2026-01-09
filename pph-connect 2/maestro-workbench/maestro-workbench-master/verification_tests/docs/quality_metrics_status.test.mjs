import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'quality_metrics_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'quality_metrics_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Quality metrics status doc describes pipeline and dashboards', () => {
  assert.ok(existsSync(docPath), 'Expected quality_metrics_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /quality_metrics/i, 'Expected quality_metrics mention');
  assert.match(content, /workerAnalyticsService/i, 'Expected worker analytics mention');
  assert.match(content, /QualityDashboard/i, 'Expected manager quality dashboard mention');
  assert.match(content, /quality_alerts|quality_warnings/i, 'Expected alerts mention');
  assert.match(content, /verification_tests\/(pages|schema|services)/i, 'Expected verification tests mention');
});
