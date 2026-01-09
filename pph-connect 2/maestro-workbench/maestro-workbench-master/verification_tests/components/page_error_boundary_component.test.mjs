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

const componentPath = resolvePath(['src', 'components', 'errors', 'PageErrorBoundary.tsx']);

test('PageErrorBoundary exports component contract', () => {
  assert.ok(existsSync(componentPath), 'Expected PageErrorBoundary.tsx to exist');
  const content = readFileSync(componentPath, 'utf8');

  assert.match(content, /import\s+\{\s*ErrorBoundary\s*\}\s+from\s+'react-error-boundary';/, 'Expected react-error-boundary import');
  assert.match(content, /export\s+const\s+PageErrorBoundary\b/, 'Expected PageErrorBoundary export');
  assert.match(content, /export\s+const\s+PageErrorFallback\b/, 'Expected fallback export');
  assert.match(content, /onReset/, 'Expected reset handler to reload data');
  assert.match(content, /console\.error\(/, 'Expected PageErrorBoundary to log errors for debugging');
});
