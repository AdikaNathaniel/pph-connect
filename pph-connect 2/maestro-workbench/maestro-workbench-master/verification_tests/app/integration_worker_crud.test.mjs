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

const workerIntegrationTestPath = resolvePath('tests', 'integration', 'api', 'workerCrud.test.ts');

test('Worker CRUD integration spec should exist with Supabase client helpers', () => {
  assert.ok(existsSync(workerIntegrationTestPath), 'Expected workerCrud.test.ts to exist');
  const content = readFileSync(workerIntegrationTestPath, 'utf8');
  assert.match(content, /Worker API - CRUD/, 'Expected Worker API suite title');
  assert.match(content, /createClient|getIntegrationClient/, 'Expected Supabase client usage');
  ['create a worker record', 'fetch newly created worker', 'update worker status', 'delete worker record'].forEach(
    (description) => {
      assert.match(content, new RegExp(description, 'i'), `Expected "${description}" test case`);
    }
  );
});
