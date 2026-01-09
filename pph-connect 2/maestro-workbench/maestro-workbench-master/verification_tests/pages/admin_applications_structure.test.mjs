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

const pagePath = resolvePath('src', 'pages', 'admin', 'ApplicationsPage.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('Admin applications page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+AdminApplicationsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+AdminApplicationsPage\b/, 'Expected default export');
});

test('Admin applications page renders table, filters, actions, and review drawer', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="admin-applications-page"',
    'data-testid="admin-applications-table"',
    'data-testid="admin-applications-status-filter"',
    'data-testid="admin-applications-domain-filter"',
    'data-testid="admin-applications-date-filter"',
    'data-testid="admin-applications-actions"',
    'data-testid="admin-application-review-panel"',
    'data-testid="admin-application-cover-letter"',
    'data-testid="admin-application-resume-link"',
    'data-testid="admin-application-approve-button"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
});

test('App exposes /admin/applications route for admins', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+AdminApplicationsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/admin\/ApplicationsPage"\)\)/,
    'Expected lazy import'
  );
  assert.match(
    content,
    /<Route\s+path="\/admin\/applications"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="admin"/,
    'Expected admin-protected /admin/applications route'
  );
});
