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

const pagePath = resolvePath('src', 'pages', 'AnonymousHotline.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('AnonymousHotline page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+AnonymousHotlinePage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+AnonymousHotlinePage\b/, 'Expected default export');
});

test('AnonymousHotline page renders hotline form and ticket ID indicator', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="hotline-page"',
    'data-testid="hotline-form"',
    'data-testid="hotline-ticket-id"',
    'Report type',
    'Description',
    'Submit anonymously'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /harassment/i);
});

test('App exposes /report route without auth', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+AnonymousHotlinePage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/AnonymousHotline"\)\)/,
    'Expected lazy import for AnonymousHotlinePage'
  );
  assert.match(
    content,
    /<Route\s+path="\/report"\s+element=\{<AnonymousHotlinePage\s*\/>\}/,
    'Expected public /report route without ProtectedRoute'
  );
});
