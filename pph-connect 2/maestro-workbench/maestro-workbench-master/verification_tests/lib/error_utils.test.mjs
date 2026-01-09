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

const errorsPath = resolvePath(['src', 'lib', 'errors', 'index.ts']);

test('error utils expose normalization helpers', () => {
  assert.ok(existsSync(errorsPath), 'Expected errors index to exist');
  const content = readFileSync(errorsPath, 'utf8');

  ['normalizeError', 'toUserFacingMessage', 'isSupabaseError', 'isNetworkError'].forEach((fn) => {
    assert.match(content, new RegExp(`export\\s+const\\s+${fn}\\b`), `Expected ${fn} export`);
  });
});

test('toUserFacingMessage returns friendly guidance for common errors', () => {
  const content = readFileSync(errorsPath, 'utf8');

  assert.match(
    content,
    /Your session may have expired\. Try signing in again\./,
    'Expected auth-friendly session expiry guidance'
  );
  assert.match(
    content,
    /The requested resource could not be found\./,
    'Expected 404 guidance'
  );
  assert.match(
    content,
    /Network connection lost\. Check your internet connection and retry\./,
    'Expected network error guidance'
  );
  assert.match(
    content,
    /An unexpected error occurred\./,
    'Expected generic fallback guidance'
  );
});

test('Supabase unique violations map to a user-friendly duplicate message', () => {
  const content = readFileSync(errorsPath, 'utf8');

  assert.match(
    content,
    /normalized\.code\s*===\s*['"]23505['"]/,
    'Expected duplicate constraint detection on Supabase code 23505'
  );
  assert.match(
    content,
    /normalized\.status\s*===\s*409/,
    'Expected duplicate constraint detection on HTTP 409 conflicts'
  );
  assert.match(
    content,
    /duplicate key value/i,
    'Expected duplicate constraint detection via message regex'
  );
  assert.match(
    content,
    /That value is already in use\. Choose a different value\./,
    'Expected friendly duplicate constraint copy'
  );
});
