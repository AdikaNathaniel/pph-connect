import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const docPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'core_tables_status.md'),
    path.join(process.cwd(), 'Reference Docs', 'core_tables_status.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

const TABLES = [
  { name: 'departments', migration: '20251106000000_update_departments_schema.sql', test: 'verification_tests/schema/departments.test.mjs' },
  { name: 'teams', migration: '20251106001000_create_teams_table.sql', test: 'verification_tests/schema/teams.test.mjs' },
  { name: 'workers', migration: '20251106002000_create_workers_table.sql', test: 'verification_tests/schema/workers.test.mjs' },
  { name: 'worker_accounts', migration: '20251106003000_create_worker_accounts_table.sql', test: 'verification_tests/schema/worker_accounts.test.mjs' },
  { name: 'projects', migration: '20251106004000_create_projects_table.sql', test: 'verification_tests/schema/projects.test.mjs' },
  { name: 'project_teams', migration: '20251106005000_create_project_teams_table.sql', test: 'verification_tests/schema/project_teams.test.mjs' },
  { name: 'worker_assignments', migration: '20251106006000_create_worker_assignments_table.sql', test: 'verification_tests/schema/worker_assignments.test.mjs' },
];

test('Core tables status doc lists migrations and tests', () => {
  assert.ok(existsSync(docPath), 'Expected core_tables_status.md to exist');
  const content = readFileSync(docPath, 'utf8');

  assert.match(content, /## Core Tables Status/, 'Missing heading for core tables');

  TABLES.forEach(({ name, migration, test }) => {
    assert.match(content, new RegExp(name, 'i'), `Missing table ${name}`);
    assert.match(content, new RegExp(migration.replace(/\./g, '\\.')), `Missing migration ${migration}`);
    assert.match(content, new RegExp(test.replace(/\./g, '\\.')), `Missing test reference ${test}`);
  });
});
