import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

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

const servicePath = resolvePath('src', 'services', 'userManagementService.ts');

test('userManagementService exports listUsers, updateUserRole, and toggleUserStatus', () => {
  assert.ok(existsSync(servicePath), 'Expected userManagementService.ts to exist');
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /export\s+async\s+function\s+listUsers/, 'Expected listUsers export');
  assert.match(content, /export\s+async\s+function\s+updateUserRole/, 'Expected updateUserRole export');
  assert.match(content, /export\s+async\s+function\s+toggleUserStatus/, 'Expected toggleUserStatus export');
});

test('userManagementService queries Supabase profiles and updates metadata', () => {
  const content = readFileSync(servicePath, 'utf8');
  assert.match(content, /from\('profiles'\)\s*\.select/, 'Expected select from profiles');
  assert.match(content, /supabase\.auth\.admin\.updateUser/, 'Expected Supabase auth admin update for metadata sync');
  assert.match(content, /\.update\(\{\s*role:/, 'Expected direct profile role update');
});
