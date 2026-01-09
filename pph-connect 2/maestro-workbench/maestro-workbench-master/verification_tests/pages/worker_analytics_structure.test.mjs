import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'Analytics.tsx');

test('App registers /w/analytics route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerAnalytics\s*=\s*React\.lazy\(\(\)\s*=>\s*import\((['"])\.\/pages\/worker\/Analytics\1\)\);/,
    'Expected lazy import for WorkerAnalytics'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/analytics"[\s\S]+?<ProtectedRoute\s+requiredRole="worker">[\s\S]+?<WorkerAnalytics\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected worker analytics route guarded for workers'
  );
});

test('WorkerAnalytics page renders required sections', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-analytics-page"/, 'Expected root test id');
  assert.match(content, /data-testid="worker-analytics-summary"/, 'Expected summary snapshot');
  [
    'analytics-chart-tasks',
    'analytics-chart-quality',
    'analytics-chart-earnings',
    'analytics-chart-speed',
    'analytics-benchmark-card',
    'analytics-insights',
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /data-testid="worker-goals-card"/, 'Expected personal goals card');
  assert.match(content, /data-testid="add-goal-button"/, 'Expected add goal button');
  assert.match(content, /workerGoalsService/i, 'Expected workerGoalsService integration');
  assert.match(content, /data-testid="worker-analytics-error"/, 'Expected error state container');
  assert.match(content, /data-testid="worker-analytics-empty"/, 'Expected empty state container');
  assert.match(content, /const\s+AnalyticsChartCard/i, 'Expected reusable chart card component');
  assert.match(content, /ResponsiveContainer/, 'Expected recharts visualization');
  assert.match(content, /fetchWorkerAnalyticsSummary/, 'Expected service usage');
});
