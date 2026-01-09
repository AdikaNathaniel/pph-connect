import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'bgc_warnings_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'bgc_warnings_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('BGC warnings status doc covers dashboard alerts, table badges, and detail headers', () => {
  assert.ok(existsSync(docPath), 'Expected bgc_warnings_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Dashboard Alerts/i, 'Missing dashboard alerts section');
  assert.match(content, /useBGCAlerts/i, 'Expected hook reference');
  assert.match(content, /## Workers Table/i, 'Missing table section');
  assert.match(content, /BGCStatusIcon/i, 'Expected status icon mention');
  assert.match(content, /WorkersTable/i, 'Expected table component mention');
  assert.match(content, /## Worker Detail/i, 'Missing detail section');
  assert.match(content, /WorkerDetail/i, 'Expected detail page mention');
});
