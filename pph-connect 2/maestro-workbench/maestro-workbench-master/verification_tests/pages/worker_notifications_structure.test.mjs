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

const appPath = resolvePath('src', 'App.tsx');
const pagePath = resolvePath('src', 'pages', 'worker', 'Notifications.tsx');

test('WorkerNotifications page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerNotificationsPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerNotificationsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerNotificationsPage\b/, 'Expected default export');
});

test('App mounts worker notifications routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Notifications"\)\)/,
    'Expected lazy import for WorkerNotifications page'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/notifications"[\s\S]+WorkerNotificationsPage[\s\S]+\/>/,
    'Expected \/worker\/notifications route'
  );
});

test('WorkerNotifications page renders preference controls', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-notifications-page"',
    'data-testid="notification-preferences-form"',
    'Reply to your thread',
    'Mention in a post',
    'Upvotes on your post'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
});
