import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const dashboardPath = resolvePath('src', 'pages', 'worker', 'Dashboard.tsx');

test('WorkerDashboard exposes required summary cards', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /data-testid="worker-dashboard-summary-grid"/,
    'Expected dashboard summary grid test id'
  );
  const requiredCards = ['projects', 'earnings', 'tasks', 'quality'];
  requiredCards.forEach((key) => {
    const identifier = `worker-dashboard-card-${key}`;
    assert.match(
      content,
      new RegExp(identifier),
      `Expected summary card for ${key}`
    );
    assert.match(
      content,
      new RegExp(`worker-dashboard-card-${key}-value`),
      `Expected value element for ${key}`
    );
  });
});

test('WorkerDashboard exposes quick action shortcuts', () => {
  const content = readFileSync(dashboardPath, 'utf8');
  assert.match(
    content,
    /data-testid="worker-dashboard-quick-actions"/,
    'Expected quick actions container'
  );
  ['assignments', 'training', 'messages', 'earnings'].forEach((key) => {
    const identifier = `worker-dashboard-quick-action-${key}`;
    assert.match(
      content,
      new RegExp(identifier),
      `Expected quick action for ${key}`
    );
  });
});
