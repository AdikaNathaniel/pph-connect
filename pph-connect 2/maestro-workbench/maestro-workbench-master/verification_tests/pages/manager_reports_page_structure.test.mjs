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
const pagePath = resolvePath('src', 'pages', 'manager', 'ReportsPage.tsx');

test('App registers /m/reports route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+ReportsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\((['"]).*\/pages\/manager\/ReportsPage\1\)\);/,
    'Expected lazy ReportsPage import'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/reports"[\s\S]+?<ReportsPage\s*\/>[\s\S]+?<\/ProtectedRoute>/,
    'Expected /m/reports ProtectedRoute'
  );
});

test('ReportsPage exposes builder controls and export actions', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="manager-reports-page"/, 'Expected page test id');
  [
    'manager-reports-builder-form',
    'manager-reports-metric-select',
    'manager-reports-group-select',
    'manager-reports-date-start',
    'manager-reports-date-end',
    'manager-reports-results-table',
    'manager-reports-chart',
    'manager-reports-export-csv',
    'manager-reports-export-pdf',
    'manager-reports-save-template',
    'manager-reports-template-list'
  ].forEach((testId) => {
    assert.match(content, new RegExp(`data-testid="${testId}"`), `Expected ${testId}`);
  });
  assert.match(content, /reportsService/i, 'Expected reportsService usage');
});
