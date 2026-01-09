import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function resolvePath(relativePath) {
  const candidates = [
    path.join(process.cwd(), relativePath),
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath)
  ];

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Could not locate ${relativePath}`);
  }

  return match;
}

const componentPath = resolvePath(path.join('src', 'components', 'ProtectedRoute.tsx'));

function readComponent() {
  return readFileSync(componentPath, 'utf8');
}

test('ProtectedRoute exports component', () => {
  const content = readComponent();
  assert.match(content, /export\s+const\s+ProtectedRoute\b/, 'Expected ProtectedRoute export');
});

test('ProtectedRoute consumes AuthContext hooks', () => {
  const content = readComponent();
  assert.match(content, /useAuth\(\)/, 'Expected useAuth hook usage');
  assert.match(content, /useUser\(\)/, 'Expected useUser hook usage');
});

test('ProtectedRoute renders loading state and redirect logic', () => {
  const content = readComponent();
  assert.match(content, /isLoading/, 'Expected loading state check');
  assert.match(content, /Navigate\b/, 'Expected redirect using react-router');
  assert.match(content, /fallback/i, 'Expected fallback or loading UI mention');
});
