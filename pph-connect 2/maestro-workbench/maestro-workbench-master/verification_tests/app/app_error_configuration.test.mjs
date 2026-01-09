import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const appPath = resolvePath(['src', 'App.tsx']);

test('App.tsx wires AppErrorBoundary around AppRoutes', () => {
  const content = readFileSync(appPath, 'utf8');

  assert.match(
    content,
    /import\s+AppErrorBoundary\s+from\s+['"]@\/components\/errors\/AppErrorBoundary['"];?/,
    'Expected AppErrorBoundary import'
  );
  assert.match(
    content,
    /<AppErrorBoundary>\s*<AppRoutes\s*\/>\s*<\/AppErrorBoundary>/,
    'Expected AppRoutes to be wrapped in AppErrorBoundary'
  );
});
