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

const componentPath = resolvePath(['src', 'components', 'errors', 'AppErrorBoundary.tsx']);

test('AppErrorBoundary exports component contract', () => {
  assert.ok(existsSync(componentPath), 'Expected AppErrorBoundary.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /import\s+\{\s*ErrorBoundary\s*\}\s+from\s+'react-error-boundary';/, 'Expected react-error-boundary import');
  assert.match(content, /export\s+const\s+AppErrorBoundary\b/, 'Expected AppErrorBoundary export');
  assert.match(content, /export\s+const\s+AppErrorFallback\b/, 'Expected fallback export');
  assert.match(content, /console\.error/, 'Expected console logging for debugging');
  assert.match(content, /toast\.error/, 'Expected toast error notification');
});
