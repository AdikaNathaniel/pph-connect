import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function readAllMigrations() {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return sqlFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = readAllMigrations();

function expectColumn(columnName) {
  const patterns = [
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.projects[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.projects[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.projects`
  );
}

test('projects table defines required enums and columns', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.project_status\s+AS\s+ENUM\s*\(\s*'active'\s*,\s*'paused'\s*,\s*'completed'\s*,\s*'cancelled'\s*\)/i,
    'Expected project_status enum with active, paused, completed, cancelled'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.project_expert_tier\s+AS\s+ENUM\s*\(\s*'tier0'\s*,\s*'tier1'\s*,\s*'tier2'\s*\)/i,
    'Expected project_expert_tier enum with tier0, tier1, tier2'
  );

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.projects/i,
    'Expected migrations to create public.projects table'
  );

  const requiredColumns = [
    'department_id',
    'project_code',
    'project_name',
    'expert_tier',
    'status',
    'start_date',
    'end_date',
    'required_qualifications',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by'
  ];

  requiredColumns.forEach(expectColumn);
});

test('projects table enforces constraints and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*project_code\s*\)/i,
    'Expected unique constraint on project_code'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_projects_department\s+ON\s+public\.projects\s*\(\s*department_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_projects_code\s+ON\s+public\.projects\s*\(\s*project_code\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_projects_status\s+ON\s+public\.projects\s*\(\s*status\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected projects table indexes for department, code, and status'
    );
  });
});

test('projects table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.projects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS to be enabled on projects'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.projects\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated SELECT policy on projects'
  );

  const writePolicyPattern = /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.projects[\s\S]+worker_has_role/i;

  assert.match(
    combinedSql,
    writePolicyPattern,
    'Expected admin-only mutation policy leveraging worker_has_role'
  );
});
