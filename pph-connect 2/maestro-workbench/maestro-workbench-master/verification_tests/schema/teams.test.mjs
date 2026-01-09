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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.teams[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.teams[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.teams`
  );
}

test('teams table defines required base columns', () => {
  const requiredColumns = [
    'department_id',
    'team_name',
    'locale_primary',
    'locale_secondary',
    'locale_region',
    'is_active',
    'created_at',
    'updated_at'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.teams/i,
    'Expected migrations to create public.teams table'
  );
});

test('teams table enforces foreign key to departments', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.teams[\s\S]+FOREIGN\s+KEY\s*\(\s*department_id\s*\)\s+REFERENCES\s+public\.departments\s*\(\s*id\s*\)/i,
    'Expected migrations to add foreign key from teams.department_id to public.departments(id)'
  );
});

test('teams table defines required indexes', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_teams_department\s+ON\s+public\.teams\s*\(\s*department_id\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_teams_locale\s+ON\s+public\.teams\s*\(\s*locale_primary\s*,\s*locale_region\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_teams_active\s+ON\s+public\.teams\s*\(\s*is_active\s*\)/i
  ];

  indexPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected migrations to define required teams indexes'
    );
  });
});

test('teams table enforces RLS policies for read and admin write', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.teams\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS to be enabled on public.teams'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.teams\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected SELECT policy granting authenticated read access to teams'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.teams[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on public.teams'
  );
});

test('teams table validates locale columns with ISO patterns', () => {
  assert.match(
    combinedSql,
    new RegExp("CONSTRAINT\\s+teams_locale_primary_check[\\s\\S]+locale_primary\\s+~\\s*'\\^\\[a-z\\]\\{2\\}\\$'", 'i'),
    'Expected locale_primary to enforce ISO language code pattern'
  );

  assert.match(
    combinedSql,
    new RegExp("CONSTRAINT\\s+teams_locale_secondary_check[\\s\\S]+\\(locale_secondary\\s+IS\\s+NULL\\s+OR\\s+locale_secondary\\s+~\\s*'\\^\\[a-z\\]\\{2\\}\\$'\\)", 'i'),
    'Expected locale_secondary to enforce optional ISO language code pattern'
  );

  assert.match(
    combinedSql,
    new RegExp("CONSTRAINT\\s+teams_locale_region_check[\\s\\S]+\\(locale_region\\s+IS\\s+NULL\\s+OR\\s+locale_region\\s+~\\s*'\\^\\[A-Z\\]\\{2\\}\\$'\\)", 'i'),
    'Expected locale_region to enforce optional ISO region code pattern'
  );
});
