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
const pagePath = resolvePath('src', 'pages', 'manager', 'ManagerAnalyticsPage.tsx');

test('App registers /m/analytics route with ManagerAnalyticsPage', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+ManagerAnalyticsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\((['"]).*\/pages\/manager\/ManagerAnalyticsPage\1\)\);/,
    'Expected lazy ManagerAnalyticsPage import'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/analytics"[\s\S]+?<ManagerAnalyticsPage\s*\/>[\s\S]+?<\/ProtectedRoute>/,
    'Expected /m/analytics to render ManagerAnalyticsPage inside ProtectedRoute'
  );
});

test('ManagerAnalyticsPage renders summary cards and charts with service hook-up', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="manager-analytics-page"/, 'Expected root test id');
  [
    'summary-active-projects',
    'summary-active-workers',
    'summary-tasks-today',
    'summary-tasks-week',
    'summary-quality-score',
    'chart-project-progress',
    'chart-worker-distribution',
    'chart-quality-trend',
    'chart-task-velocity',
    'alerts'
  ].forEach((suffix) => {
    assert.match(content, new RegExp(`data-testid="manager-analytics-${suffix}"`), `Expected ${suffix}`);
  });
  assert.match(content, /managerAnalyticsService/i, 'Expected managerAnalyticsService usage');
});
