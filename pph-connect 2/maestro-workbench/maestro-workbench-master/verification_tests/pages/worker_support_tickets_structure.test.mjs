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

const pagePath = resolvePath('src', 'pages', 'worker', 'SupportTickets.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('WorkerSupportTickets page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerSupportTicketsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerSupportTicketsPage\b/, 'Expected default export');
});

test('WorkerSupportTickets page renders form and ticket list with filters', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="support-tickets-page"',
    'data-testid="support-ticket-form"',
    'data-testid="support-ticket-list"',
    'data-testid="support-ticket-status-filter"',
    'data-testid="support-ticket-priority-filter"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  ['Subject', 'Category', 'Priority', 'Description'].forEach((field) => {
    assert.match(content, new RegExp(field), `Expected form label ${field}`);
  });
});

test('App mounts /support/tickets route for workers', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerSupportTicketsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/SupportTickets"\)\)/,
    'Expected lazy import for WorkerSupportTicketsPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/support\/tickets"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="worker"/,
    'Expected worker-protected route for /support/tickets'
  );
});
