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

const hookPath = resolvePath('src', 'hooks', 'useUserManagement.ts');

test('useUserManagement enforces admin permissions before API calls', () => {
  const content = readFileSync(hookPath, 'utf8');
  assert.match(
    content,
    /import\s+\{\s*useAuth\s*\}\s+from\s+'@\/contexts\/AuthContext';/,
    'Expected useAuth import'
  );
  assert.match(
    content,
    /import\s+\{[^}]*hasRole[^}]*\}\s+from\s+'@\/lib\/auth\/roles';/,
    'Expected hasRole import'
  );
  assert.match(
    content,
    /const\s+\{\s*user\s*\}\s*=\s*useAuth\(\);\s*const\s+canManage\s*=\s*hasRole\(user\?\.role[^,]+,\s*'admin'\);/,
    'Expected hook to read auth context and compute capabilities'
  );
  assert.match(
    content,
    /if\s*\(!canManage\)\s*\{[\s\S]+setError\('Insufficient permissions'\);[\s\S]+setIsLoading\(false\);[\s\S]+return;/,
    'Expected permission check before fetching users'
  );
  assert.match(
    content,
    /if\s*\(!canManage\)\s*\{\s*toast\.error\('Insufficient permissions'\);[\s\S]+return;\s*\}[\s\S]+await\s+updateUserRole/,
    'Expected role change handler to guard actions'
  );
});
