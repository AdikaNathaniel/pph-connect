import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const dashboardPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'pages', 'manager', 'StatsDashboard.tsx'),
    path.join(process.cwd(), 'src', 'pages', 'manager', 'StatsDashboard.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate StatsDashboard.tsx');
  }
  return match;
})();

const content = readFileSync(dashboardPath, 'utf8');

test('StatsDashboard exports component and default', () => {
  assert.match(content, /export\s+const\s+StatsDashboard/, 'Expected named export');
  assert.match(content, /export\s+default\s+StatsDashboard/, 'Expected default export');
});

test('StatsDashboard renders summary cards and charts', () => {
  assert.match(content, /SAMPLE_SUMMARY/, 'Expected summary dataset');
  assert.match(content, /data-testid="stats-dashboard"/, 'Expected dashboard root test id');
  assert.match(content, /data-testid="stats-dashboard-earnings-chart"/, 'Expected earnings chart placeholder');
  assert.match(content, /data-testid="stats-dashboard-project-chart"/, 'Expected project chart placeholder');
  assert.match(content, /data-testid="stats-dashboard-top-earners"/, 'Expected top earners table');
});
