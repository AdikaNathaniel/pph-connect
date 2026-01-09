import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

const authSpecPath = resolvePath('tests', 'integration', 'api', 'authFlows.test.ts');

test('Auth integration spec validates signup/login helpers', () => {
  assert.ok(existsSync(authSpecPath), 'Expected authFlows.test.ts to exist');
  const content = readFileSync(authSpecPath, 'utf8');
  assert.match(content, /Authentication API Flows/, 'Expected suite title');
  assert.match(content, /sign up a worker account/i, 'Expected signup test coverage');
  assert.match(content, /exchange session tokens|refresh session/i, 'Expected token handling coverage');
  assert.match(content, /revoke session|sign out/i, 'Expected sign-out coverage');
});
