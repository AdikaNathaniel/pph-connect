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
const pagePath = resolvePath('src', 'pages', 'admin', 'AutoRemovalsPage.tsx');

test('App registers /admin/auto-removals route under admin access', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+AdminAutoRemovalsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/admin\/AutoRemovalsPage"\)\)/,
    'Expected lazy import for AdminAutoRemovalsPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/admin\/auto-removals"[\s\S]+?<ProtectedRoute\s+requiredRole="admin">[\s\S]+?<AdminAutoRemovalsPage\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected /admin/auto-removals route protected for admins'
  );
});

test('AdminAutoRemovalsPage renders metrics widgets and audit table', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="admin-auto-removals-page"/, 'Expected root test id');
  assert.match(content, /fetchRemovalMetrics/, 'Expected metrics query');
  assert.match(content, /fetchRemovalAudits/, 'Expected audit list query');
  assert.match(content, /data-testid="removal-metric-total"/, 'Expected total removal metric');
  assert.match(content, /data-testid="removal-metric-appeal"/, 'Expected appeal metric');
  assert.match(content, /data-testid="removal-metric-reinstatement"/, 'Expected reinstatement metric');
  assert.match(content, /data-testid="removal-trend-chart"/, 'Expected chart or trend area');
  assert.match(content, /data-testid="removal-audit-table"/, 'Expected audit table container');
});
