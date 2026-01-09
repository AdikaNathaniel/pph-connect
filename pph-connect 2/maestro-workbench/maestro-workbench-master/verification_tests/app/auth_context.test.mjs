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

const authContextPath = resolvePath(path.join('src', 'contexts', 'AuthContext.tsx'));

function readAuthContext() {
  return readFileSync(authContextPath, 'utf8');
}

test('AuthContext exports provider and hooks', () => {
  const content = readAuthContext();
  assert.match(content, /export\s+const\s+AuthProvider\b/, 'Expected AuthProvider export');
  assert.match(content, /export\s+const\s+useAuth\b/, 'Expected useAuth hook export');
  assert.match(content, /export\s+const\s+useUser\b/, 'Expected useUser hook export');
  assert.match(content, /export\s+const\s+useSession\b/, 'Expected useSession hook export');
  assert.match(content, /isAdmin/, 'Expected isAdmin flag in context');
});

test('AuthContext manages loading, error, and refresh helpers', () => {
  const content = readAuthContext();
  assert.match(content, /isLoading/, 'Expected loading state handling');
  assert.match(content, /error/i, 'Expected error handling to be present');
  assert.match(content, /refreshSession/, 'Expected refreshSession helper');
});

test('AuthContext wires Supabase session listeners', () => {
  const content = readAuthContext();
  assert.match(content, /supabase\.auth\.onAuthStateChange/, 'Expected auth state listener');
  assert.match(content, /supabase\.auth\.getSession/, 'Expected initial session fetch');
});

test('AuthContext syncs normalized role metadata into Supabase auth user', () => {
  const content = readAuthContext();
  assert.match(
    content,
    /import\s+\{\s*[^}]*normalizeRole[^}]*\}\s+from\s+'@\/lib\/auth\/roles';/,
    'Expected normalizeRole import'
  );
  assert.match(
    content,
    /supabase\.auth\.updateUser\(\s*\{\s*data:\s*\{\s*role:/,
    'Expected Supabase auth metadata update for role'
  );
});
