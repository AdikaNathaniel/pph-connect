import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const appPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'App.tsx'),
    path.join(process.cwd(), 'src', 'App.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate App.tsx');
  }
  return match;
})();

const content = readFileSync(appPath, 'utf8');

test('App lazily loads manager dashboard route', () => {
  assert.match(
    content,
    /const\s+ManagerDashboard\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\(\s*['"]\.\/pages\/manager\/Dashboard['"]\s*\)\s*\)/,
    'Expected ManagerDashboard to be imported via React.lazy'
  );
});

test('App wraps route tree in Suspense fallback', () => {
  assert.match(
    content,
    /<Suspense[\s\S]*fallback=/,
    'Expected Suspense with a fallback around routes'
  );
});
