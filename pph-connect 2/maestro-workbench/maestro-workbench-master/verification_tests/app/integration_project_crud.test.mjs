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

const projectSpecPath = resolvePath('tests', 'integration', 'api', 'projectCrud.test.ts');

test('Project CRUD integration spec should declare Supabase-driven scenarios', () => {
  assert.ok(existsSync(projectSpecPath), 'Expected projectCrud.test.ts to exist');
  const content = readFileSync(projectSpecPath, 'utf8');
  assert.match(content, /Project API - CRUD/, 'Expected suite title');
  assert.match(content, /create a project/, 'Expected creation test');
  assert.match(content, /update project attributes/, 'Expected update test');
  assert.match(content, /archive project/, 'Expected delete/archive test');
});
