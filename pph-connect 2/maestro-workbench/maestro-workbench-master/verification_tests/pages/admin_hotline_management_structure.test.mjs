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

const pagePath = resolvePath('src', 'pages', 'admin', 'HotlineManagement.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('Admin hotline management page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+AdminHotlineManagementPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+AdminHotlineManagementPage\b/, 'Expected default export');
});

test('Admin hotline management page renders list, filters, and audit trail', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="hotline-management-page"',
    'data-testid="hotline-management-table"',
    'data-testid="hotline-management-status-filter"',
    'data-testid="hotline-management-category-filter"',
    'data-testid="hotline-management-audit-trail"',
    'data-testid="hotline-management-resolution-form"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /anonym/i, 'Expected anonymity messaging');
});

test('App exposes /admin/reports route protected for admins', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+AdminHotlineManagementPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/admin\/HotlineManagement"\)\)/,
    'Expected lazy import for AdminHotlineManagementPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/admin\/reports"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="admin"/,
    'Expected admin-protected route for /admin/reports'
  );
});
