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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.project_teams[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.project_teams[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.project_teams`
  );
}

test('project_teams table defines required columns and foreign keys', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.project_teams/i,
    'Expected migrations to create public.project_teams table'
  );

  const requiredColumns = [
    'project_id',
    'team_id',
    'created_at',
    'created_by'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i,
    'Expected project_id column to reference projects with cascade'
  );

  assert.match(
    combinedSql,
    /team_id\s+[^\n]*REFERENCES\s+public\.teams\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i,
    'Expected team_id column to reference teams with cascade'
  );
});

test('project_teams table enforces unique constraint and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*project_id\s*,\s*team_id\s*\)/i,
    'Expected unique constraint on (project_id, team_id)'
  );

  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_project_teams_project\s+ON\s+public\.project_teams\s*\(\s*project_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_project_teams_team\s+ON\s+public\.project_teams\s*\(\s*team_id\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected project_teams indexes for project_id and team_id'
    );
  });
});

test('project_teams table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.project_teams\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on project_teams'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.project_teams\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on project_teams'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.project_teams[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on project_teams'
  );
});
