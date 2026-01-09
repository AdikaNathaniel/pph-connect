import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolveDocPath = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'authentication_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'authentication_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDocPath();

test('Authentication status doc outlines landing, context, protected routes, and password enforcement', () => {
  assert.ok(existsSync(docPath), 'Expected authentication_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Landing Flow/i, 'Missing Landing Flow section');
  assert.match(content, /signInWithPassword/i, 'Expected Supabase password flow mention');
  assert.match(content, /## Auth Context/i, 'Missing Auth Context section');
  assert.match(content, /refreshSession/i, 'Expected refresh helper reference');
  assert.match(content, /## Protected Routes/i, 'Missing Protected Routes section');
  assert.match(content, /ProtectedRoute/i, 'Expected ProtectedRoute mention');
  assert.match(content, /## Password Enforcement/i, 'Missing password enforcement section');
  assert.match(content, /change-password/i, 'Expected password change redirect mention');
});
