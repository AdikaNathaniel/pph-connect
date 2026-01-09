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

const pagePath = resolvePath('src', 'pages', 'manager', 'KnowledgeBaseAdmin.tsx');
const appPath = resolvePath('src', 'App.tsx');

test('ManagerKnowledgeBaseAdmin page exports component contract', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /export\s+const\s+ManagerKnowledgeBaseAdminPage\b/, 'Expected named export');
  assert.match(content, /export\s+default\s+ManagerKnowledgeBaseAdminPage\b/, 'Expected default export');
});

test('ManagerKnowledgeBaseAdmin page renders creation form with editor, attachments, and version history', () => {
  const content = readFileSync(pagePath, 'utf8');
  [
    'data-testid="kb-admin-form"',
    'data-testid="kb-admin-editor"',
    'data-testid="kb-admin-attachments"',
    'data-testid="kb-admin-status-select"',
    'data-testid="kb-admin-version-history"'
  ].forEach((token) => {
    assert.match(content, new RegExp(token), `Expected ${token}`);
  });
  assert.match(content, /RichTextEditor/, 'Expected RichTextEditor import');
});

test('App mounts /m/knowledge-base route for managers', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+ManagerKnowledgeBaseAdminPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/manager\/KnowledgeBaseAdmin"\)\)/,
    'Expected lazy import for ManagerKnowledgeBaseAdminPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/m\/knowledge-base"[\s\S]+?<ProtectedRoute[\s\S]+?requiredRole="manager"/,
    'Expected manager-protected route for /m/knowledge-base'
  );
});
