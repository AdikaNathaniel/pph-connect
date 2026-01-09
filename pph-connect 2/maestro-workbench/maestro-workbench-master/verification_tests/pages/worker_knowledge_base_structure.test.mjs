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
const pagePath = resolvePath('src', 'pages', 'worker', 'KnowledgeBase.tsx');

test('WorkerKnowledgeBase page exports component contract', () => {
  assert.ok(existsSync(pagePath), 'Expected WorkerKnowledgeBasePage to exist');
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerKnowledgeBasePage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerKnowledgeBasePage\b/, 'Expected default export');
});

test('App mounts /help route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/KnowledgeBase"\)\)/,
    'Expected lazy import for KnowledgeBase page'
  );
  assert.match(
    content,
    /<Route\s+path="\/help"[\s\S]+WorkerKnowledgeBasePage[\s\S]+\/>/,
    'Expected \/help route'
  );
});

test('WorkerKnowledgeBase page renders categories and search', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="worker-kb-page"',
    'data-testid="kb-category-grid"',
    'data-testid="kb-article-list"',
    'data-testid="kb-search-input"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
});

test('WorkerKnowledgeBase page includes related articles section', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="kb-article-content"/, 'Expected article content section');
  assert.match(content, /data-testid="kb-related-articles"/, 'Expected related articles section');
  assert.match(content, /Related articles/i, 'Expected related articles heading');
});

test('WorkerKnowledgeBase page includes helpful feedback controls', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="kb-helpful-feedback"/, 'Expected helpful feedback container');
  assert.match(content, /Was this helpful\?/i, 'Expected helpful prompt');
});
