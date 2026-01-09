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
const pagePath = resolvePath('src', 'pages', 'worker', 'AppealsPage.tsx');

test('App registers /worker/appeals route', () => {
  const content = readFileSync(appPath, 'utf8');
  assert.match(
    content,
    /const\s+WorkerAppealsPage\s*=\s*React\.lazy\(\(\)\s*=>\s*import\("\.\/pages\/worker\/AppealsPage"\)\)/,
    'Expected lazy import for WorkerAppealsPage'
  );
  assert.match(
    content,
    /<Route\s+path="\/worker\/appeals"[\s\S]+?<ProtectedRoute\s+requiredRole="worker">[\s\S]+?<WorkerAppealsPage\s*\/>[\s\S]+?<\/ProtectedRoute>[\s\S]+?\/>/,
    'Expected /worker/appeals route guarded for workers'
  );
});

test('WorkerAppealsPage renders list + submission affordances', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="worker-appeals-page"/, 'Expected root test id');
  assert.match(content, /fetchAppealableRemovals/, 'Expected appeals service usage for loading');
  assert.match(content, /submitAppeal/, 'Expected submit handler');
  assert.match(content, /data-testid="appeal-status-badge"/, 'Expected status badge for each appeal');
  assert.match(content, /data-testid="appeal-message-textarea"/, 'Expected appeal message input');
  assert.match(content, /data-testid="submit-appeal-button"/, 'Expected submit button');
});
