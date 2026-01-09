import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const packagePath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'package.json'),
    path.join(process.cwd(), 'package.json'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const REQUIRED_TABLES = ['departments', 'teams', 'workers', 'worker_accounts', 'projects', 'project_teams', 'worker_assignments'];

test('package.json exposes test:core-tables script covering all core schemas', () => {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  assert(pkg.scripts, 'Expected package.json scripts to exist');
  const script = pkg.scripts['test:core-tables'];
  assert.ok(script, 'Expected test:core-tables script');
  REQUIRED_TABLES.forEach((table) => {
    const regex = new RegExp(`verification_tests\\/schema\\/${table}\\.test\\.mjs`, 'i');
    assert.match(script, regex, `Expected script to run ${table} schema test`);
  });
});
