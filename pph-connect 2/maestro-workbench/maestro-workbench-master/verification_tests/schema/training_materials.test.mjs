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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.training_materials[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.training_materials[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.training_materials`
  );
}

test('training_materials table defines required columns and foreign key', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.training_materials/i,
    'Expected migrations to create public.training_materials table'
  );

  const requiredColumns = [
    'project_id',
    'title',
    'description',
    'type',
    'url',
    'created_at',
    'created_by'
  ];

  requiredColumns.forEach(expectColumn);

  assert.match(
    combinedSql,
    /project_id\s+[^\n]*REFERENCES\s+public\.projects\s*\(\s*id\s*\)/i,
    'Expected project_id to reference projects'
  );
});

test('training_materials table enforces index and RLS policies', () => {
  assert.match(
    combinedSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_training_materials_project\s+ON\s+public\.training_materials\s*\(\s*project_id\s*\)/i,
    'Expected project index on training_materials'
  );

  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.training_materials\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on training_materials'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.training_materials\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on training_materials'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.training_materials[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on training_materials'
  );
});
