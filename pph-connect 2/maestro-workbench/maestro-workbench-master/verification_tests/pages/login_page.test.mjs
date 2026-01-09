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

const pagePath = resolvePath(path.join('src', 'pages', 'LoginPage.tsx'));

function readLoginPage() {
  return readFileSync(pagePath, 'utf8');
}

test('LoginPage renders expected form inputs and links', () => {
  const content = readLoginPage();
  assert.match(content, /name="email"/, 'Expected email input');
  assert.match(content, /name="password"/, 'Expected password input');
  assert.match(content, /Forgot Password/i, 'Expected forgot password link');
  assert.match(content, /Sign In/i, 'Expected sign-in button');
});

test('LoginPage integrates form validation and supabase auth', () => {
  const content = readLoginPage();
  assert.match(content, /useForm/, 'Expected React Hook Form usage');
  assert.match(content, /z\.object/, 'Expected Zod schema validation');
  assert.match(content, /supabase\.auth\.signInWithPassword/, 'Expected supabase auth call');
});

test('LoginPage handles loading, error, and redirects', () => {
  const content = readLoginPage();
  assert.match(content, /isSubmitting/, 'Expected loading state handling');
  assert.match(content, /setError/, 'Expected error state handling');
  assert.match(content, /Navigate/, 'Expected redirect for already logged-in users');
});
