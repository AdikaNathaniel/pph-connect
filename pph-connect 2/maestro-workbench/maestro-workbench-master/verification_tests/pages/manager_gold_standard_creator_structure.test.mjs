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
const pagePath = resolvePath('src', 'pages', 'manager', 'GoldStandardsPage.tsx');

test('App registers /m/projects/:projectId/gold-standards route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+GoldStandardsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\((?:'|")\.\/pages\/manager\/GoldStandardsPage(?:'|")\)\);/,
    'Expected lazy import for GoldStandardsPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/projects\/:projectId\/gold-standards"[\s\S]+?<ProtectedRoute\s+requiredRole="manager">[\s\S]+?<ManagerLayout[\s\S]+pageTitle="Gold Standards"[\s\S]+?<GoldStandardsPage\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected managed route guarded by ProtectedRoute'
  );
});

test('GoldStandardsPage renders management layout hooks and dataviews', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+GoldStandardsPage\b/, 'Expected named export');
  assert.match(content, /data-testid="manager-gold-standards"/, 'Expected root test id');
  [
    /data-testid="gold-standard-distribution"/i,
    /data-testid="gold-standard-question-table"/i,
    /data-testid="gold-standard-new-form"/i,
    /data-testid="gold-standard-actions"/i,
  ].forEach((pattern) => {
    assert.match(content, pattern, `Expected element matching ${pattern}`);
  });
  assert.match(
    content,
    /useParams(?:<[^>]+>)?\(\s*\)/,
    'Expected useParams hook to read project id'
  );
  assert.match(content, /@\/services\/goldStandardService/, 'Expected import from goldStandardService');
});

test('GoldStandardsPage uses react-query for data fetching', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /useQuery\(/, 'Expected useQuery usage');
  assert.match(content, /useMutation\(/, 'Expected useMutation usage');
});
