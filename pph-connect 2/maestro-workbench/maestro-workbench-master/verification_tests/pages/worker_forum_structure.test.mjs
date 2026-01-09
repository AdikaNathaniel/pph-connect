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
const communityAppPath = resolvePath('src', 'pages', 'community', 'Forum.tsx');
const workerForumPath = resolvePath('src', 'pages', 'worker', 'Forum.tsx');

test('WorkerForum page exports component contract', () => {
  assert.ok(existsSync(workerForumPath), 'Expected WorkerForumPage to exist');
  const content = readFileSync(workerForumPath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerForumPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerForumPage\b/, 'Expected default export');
});

test('App mounts worker forum routes', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/Forum"\)\)/,
    'Expected lazy import for WorkerForum page'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/forum"[\s\S]+WorkerForumPage[\s\S]+\/>/,
    'Expected \/worker\/forum route'
  );
  assert.match(
    content,
    /<Route\s+path="\/w\/forum"[\s\S]+WorkerForumPage[\s\S]+\/>/,
    'Expected \/w\/forum route'
  );
});

test('WorkerForum page renders categories and threads list', () => {
  const content = readFileSync(workerForumPath, 'utf8');
  assert.match(content, /worker-forum-page/, 'Expected worker forum test id');
  [
    'data-testid="forum-category-list"',
    'data-testid="forum-thread-list"',
    'data-testid="forum-thread-view"',
    'data-testid="forum-post-list"',
    'data-testid="forum-thread-composer"',
    'data-testid="forum-thread-actions"',
    'data-testid="forum-report-button"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /Markdown/i, 'Expected markdown support mention');
});

test('WorkerForum page uses forum service helpers', () => {
  const content = readFileSync(workerForumPath, 'utf8');
  assert.match(content, /from\s+'@\/services\/forumService';/, 'Expected forumService import');
  assert.match(content, /getForumCategories/i, 'Expected categories helper usage');
  assert.match(content, /getThreadsByCategory/i, 'Expected threads helper usage');
});

test('Community forum page exists for /community route', () => {
  assert.ok(existsSync(communityAppPath), 'Expected community ForumPage to exist');
  const content = readFileSync(communityAppPath, 'utf8');
  assert.match(content, /community-forum-page/, 'Expected dedicated /community page structure');
  const appContent = readFileSync(appPath, 'utf8');
  assert.match(
    appContent,
    /<Route\s+path="\/community"[\s\S]+ForumPage[\s\S]+\/>/,
    'Expected \/community route mounted'
  );
});
