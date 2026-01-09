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
const pagePath = resolvePath('src', 'pages', 'worker', 'MyApplicationsPage.tsx');

test('MyApplicationsPage exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected MyApplicationsPage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+MyApplicationsPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+MyApplicationsPage\b/, 'Expected default export');
});

test('App mounts worker applications route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/MyApplicationsPage"\)\)/,
    'Expected lazy import for MyApplicationsPage'
  );
  assert.match(
    content,
    /<Route[\s\S]+path="\/worker\/applications"[\s\S]+MyApplicationsPage[\s\S]+\/>/,
    'Expected worker applications route'
  );
});

test('MyApplicationsPage queries worker_applications and renders states', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-applications-header"',
    'data-testid="worker-applications-list"',
  ].forEach((testId) => {
    assert.match(content, new RegExp(testId), `Expected ${testId}`);
  });
  assert.match(
    content,
    /supabase[\s\S]+\.from\('worker_applications'\)/,
    'Expected worker_applications query'
  );
  assert.match(content, /statusLabel|statusBadge|applicationStatuses|statusMeta/, 'Expected status mapping');
  assert.match(content, /pending/i, 'Expected pending status');
  assert.match(content, /approved/i, 'Expected approved status');
  assert.match(content, /rejected/i, 'Expected rejected status');
});
