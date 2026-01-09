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

const pagePath = resolvePath('src', 'pages', 'worker', 'SelfServiceSupport.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('SelfServiceSupport page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+WorkerSelfServiceSupportPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+WorkerSelfServiceSupportPage\b/, 'Expected default export');
});

test('SelfServiceSupport page renders required sections and search', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="support-page"',
    'data-testid="support-search-input"',
    'data-testid="support-faq-section"',
    'data-testid="support-videos-section"',
    'data-testid="support-troubleshooting-section"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /knowledgeBaseArticles/, 'Expected page to reuse knowledge base articles');
});

test('App mounts /support route for workers', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerSelfServiceSupportPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/SelfServiceSupport"\)\)/,
    'Expected lazy import for SelfServiceSupport page'
  );
  assert.match(
    content,
    /<Route\s+path="\/support"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="worker"/,
    'Expected /support route guarded for workers'
  );
});
