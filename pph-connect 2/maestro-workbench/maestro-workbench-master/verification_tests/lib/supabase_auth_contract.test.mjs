import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolveModule = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments)
  ];
  const match = candidates.find((entry) => existsSync(entry));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const modulePath = resolveModule('src', 'lib', 'supabase', 'auth.ts');

test('Supabase auth helpers export expected functions', () => {
  const content = readFileSync(modulePath, 'utf8');
  ['signIn', 'signOut', 'resetPassword', 'getCurrentUser', 'getSession'].forEach((fnName) => {
    assert.match(content, new RegExp(`export\\s+const\\s+${fnName}\\b`), `Expected ${fnName} export`);
  });
});

test('Supabase auth helpers wrap supabase.auth APIs', () => {
  const content = readFileSync(modulePath, 'utf8');
  assert.match(
    content,
    /supabase\.auth\.signInWithPassword/,
    'Expected signIn to use supabase.auth.signInWithPassword'
  );
  assert.match(content, /supabase\.auth\.signOut/, 'Expected signOut to use supabase.auth.signOut');
  assert.match(
    content,
    /supabase\.auth\.resetPasswordForEmail/,
    'Expected resetPassword to use supabase.auth.resetPasswordForEmail'
  );
  assert.match(content, /supabase\.auth\.getUser/, 'Expected getCurrentUser to use supabase.auth.getUser');
  assert.match(content, /supabase\.auth\.getSession/, 'Expected getSession to use supabase.auth.getSession');
});
