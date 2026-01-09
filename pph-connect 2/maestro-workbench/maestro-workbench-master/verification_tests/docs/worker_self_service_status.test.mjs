import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'worker_self_service_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'worker_self_service_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('Worker self-service doc covers dashboard, onboarding, support, and analytics', () => {
  assert.ok(existsSync(docPath), 'Expected worker_self_service_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /dashboard/i, 'Expected dashboard mention');
  assert.match(content, /workerAnalyticsService|UnlockProgress/i, 'Expected analytics mention');
  assert.match(content, /onboarding/i, 'Expected onboarding mention');
  assert.match(content, /support|Knowledge Base/i, 'Expected support/KB mention');
  assert.match(content, /worker_earnings/i, 'Expected earnings mention');
  assert.match(content, /verification_tests\/pages\/worker_/i, 'Expected verification tests mention');
});
