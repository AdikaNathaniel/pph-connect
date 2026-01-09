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
const pagePath = resolvePath('src', 'pages', 'manager', 'UserManagementPage.tsx');

test('UserManagementPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected UserManagementPage.tsx to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+UserManagementPage\b/, 'Expected named UserManagementPage export');
  assert.match(content, /export\s+default\s+UserManagementPage\b/, 'Expected default UserManagementPage export');
});

test('App mounts UserManagementPage for /users route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+UserManagementPage\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\("\.\/pages\/manager\/UserManagementPage"\)\s*\);/,
    'Expected lazy import for UserManagementPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/users"\s+element=\{\s*<ProtectedRoute[^>]*requiredRole="admin"[^>]*>\s*<ManagerLayout[^>]*pageTitle="User Management"[^>]*>\s*<UserManagementPage\s*\/>\s*<\/ManagerLayout>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    'Expected protected /users route to mount UserManagementPage'
  );
});

test('UserManagementPage renders table, role selector, and activation controls', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="user-management-table"',
    'data-testid="user-management-role-select"',
    'data-testid="user-management-activation-toggle"',
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(content, /useUserManagement/, 'Expected custom hook or service usage for listing users');
  assert.match(content, /Assign Role/, 'Expected role assignment copy');
  assert.match(content, /Deactivate User/, 'Expected activation control copy');
});
