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

const rolesPath = resolvePath('src', 'lib', 'auth', 'roles.ts');

test('roles helper exports hierarchy constants and helpers', () => {
  assert.ok(existsSync(rolesPath), 'Expected src/lib/auth/roles.ts to exist');
  const content = readFileSync(rolesPath, 'utf8');
  assert.match(content, /export\s+const\s+ROLE_HIERARCHY/, 'Expected ROLE_HIERARCHY export');
  assert.match(content, /export\s+type\s+UserRole\b/, 'Expected UserRole type export');
  assert.match(content, /export\s+function\s+hasRole/, 'Expected hasRole helper export');
  assert.match(content, /export\s+function\s+normalizeRole/, 'Expected normalizeRole helper export');
});

test('ROLE_HIERARCHY defines super_admin > admin > manager > team_lead > worker ordering', () => {
  const content = readFileSync(rolesPath, 'utf8');
  assert.match(
    content,
    /ROLE_HIERARCHY\s*=\s*\[\s*'super_admin'\s*,\s*'admin'\s*,\s*'manager'\s*,\s*'team_lead'\s*,\s*'worker'\s*\]/,
    'Expected ROLE_HIERARCHY to enumerate roles in descending privilege order'
  );
});
