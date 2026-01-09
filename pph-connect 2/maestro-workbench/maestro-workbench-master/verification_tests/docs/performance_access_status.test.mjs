import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'performance_access_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'performance_access_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Performance access doc covers thresholds, logic, and UI surfaces', () => {
  assert.ok(existsSync(docPath), 'Expected performance_access_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /performance_thresholds/i, 'Expected performance_thresholds mention');
  assert.match(content, /performanceMonitoringLogic/i, 'Expected logic mention');
  assert.match(content, /WorkersTable/i, 'Expected WorkersTable mention');
  assert.match(content, /taskUnlockService/i, 'Expected task unlock mention');
  assert.match(content, /verification_tests/i, 'Expected verification tests mention');
});
