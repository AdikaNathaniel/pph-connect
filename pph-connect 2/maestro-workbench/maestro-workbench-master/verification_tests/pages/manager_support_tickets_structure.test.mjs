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

const pagePath = resolvePath('src', 'pages', 'manager', 'SupportTicketManagement.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('ManagerSupportTicketManagement page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ManagerSupportTicketManagementPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+ManagerSupportTicketManagementPage\b/, 'Expected default export');
});

test('ManagerSupportTicketManagement page renders filters, table, assignment, and reply drawer', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="manager-ticket-page"',
    'data-testid="manager-ticket-table"',
    'data-testid="manager-ticket-status-filter"',
    'data-testid="manager-ticket-priority-filter"',
    'data-testid="manager-ticket-category-filter"',
    'data-testid="manager-ticket-reply-panel"',
    'data-testid="manager-ticket-assignee-select"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /threaded conversation/i, 'Expected reference to threaded replies');
});

test('App mounts /manager/tickets route for managers', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+ManagerSupportTicketManagementPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/SupportTicketManagement"\)\)/,
    'Expected lazy import for ManagerSupportTicketManagementPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/manager\/tickets"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="manager"/,
    'Expected manager-protected route for /manager/tickets'
  );
});
