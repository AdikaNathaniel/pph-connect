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
    new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?public\\.locale_mappings[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.locale_mappings[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  assert.ok(
    patterns.some((pattern) => pattern.test(combinedSql)),
    `Expected migrations to define "${columnName}" on public.locale_mappings`
  );
}

test('locale_mappings table defines required columns', () => {
  assert.match(
    combinedSql,
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.locale_mappings/i,
    'Expected migrations to create public.locale_mappings table'
  );

  const requiredColumns = [
    'client_locale_code',
    'standard_iso_code',
    'locale_name',
    'created_at'
  ];

  requiredColumns.forEach(expectColumn);
});

test('locale_mappings table enforces unique constraint and indexes', () => {
  assert.match(
    combinedSql,
    /UNIQUE\s*\(\s*client_locale_code\s*\)/i,
    'Expected unique constraint on client_locale_code'
  );

  assert.match(
    combinedSql,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_locale_mappings_standard\s+ON\s+public\.locale_mappings\s*\(\s*standard_iso_code\s*\)/i,
    'Expected index on standard_iso_code for lookup'
  );
});

test('locale_mappings table enforces RLS policies', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.locale_mappings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS enabled on locale_mappings'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.locale_mappings\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected authenticated read policy on locale_mappings'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.locale_mappings[\s\S]+p\.role\s+IN\s*\(\s*'root'\s*,\s*'admin'\s*\)/i,
    'Expected admin-only mutation policy on locale_mappings'
  );
});
