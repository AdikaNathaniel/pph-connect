import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

function loadMigrationSql() {
  const files = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith('.sql'))
    .sort();

  return files
    .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');
}

const combinedSql = loadMigrationSql();

function ensureColumnPresence(columnName) {
  const patterns = [
    new RegExp(`CREATE\\s+TABLE\\s+public\\.departments[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.departments[\\s\\S]+ADD\\s+COLUMN[\\s\\S]+${columnName}`, 'i'),
    new RegExp(`ALTER\\s+TABLE\\s+public\\.departments[\\s\\S]+RENAME\\s+COLUMN[\\s\\S]+${columnName}`, 'i')
  ];

  const matches = patterns.some((pattern) => pattern.test(combinedSql));

  assert.ok(
    matches,
    `Expected migrations to define "${columnName}" column on public.departments`
  );
}

test('departments table defines required columns', () => {
  const requiredColumns = [
    'department_name',
    'department_code',
    'is_active',
    'created_at',
    'updated_at'
  ];

  requiredColumns.forEach((column) => ensureColumnPresence(column));
});

test('departments table enforces unique department_code', () => {
  const uniqueConstraintPattern = /UNIQUE\s*\(\s*department_code\s*\)/i;

  assert.match(
    combinedSql,
    uniqueConstraintPattern,
    'Expected migrations to enforce UNIQUE constraint on department_code'
  );
});

test('departments table defines required indexes', () => {
  const indexPatterns = [
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_departments_code\s+ON\s+public\.departments\s*\(\s*department_code\s*\)/i,
    /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_departments_active\s+ON\s+public\.departments\s*\(\s*is_active\s*\)/i
  ];

  indexPatterns.forEach((pattern, idx) => {
    assert.match(
      combinedSql,
      pattern,
      idx === 0
        ? 'Expected migrations to create idx_departments_code on department_code'
        : 'Expected migrations to create idx_departments_active on is_active'
    );
  });
});

test('departments table enforces RLS policies with admin-only write access', () => {
  assert.match(
    combinedSql,
    /ALTER\s+TABLE\s+public\.departments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    'Expected RLS to be enabled on public.departments'
  );

  assert.match(
    combinedSql,
    /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.departments\s+FOR\s+SELECT\s+TO\s+authenticated/i,
    'Expected read policy granting SELECT to authenticated users'
  );

  const writePolicyPattern = /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+public\.departments\s+(?:FOR\s+ALL|FOR\s+(?:INSERT|UPDATE|DELETE)[\s\S]+)\s+TO\s+authenticated[\s\S]+worker_has_role/i;

  assert.match(
    combinedSql,
    writePolicyPattern,
    'Expected write policy to restrict modifications using worker_has_role'
  );
});

test('departments migration documents rollback steps', () => {
  const rollbackPatterns = [
    /--\s*Rollback:.*DROP\s+INDEX\s+IF\s+EXISTS\s+idx_departments_code/i,
    /--\s*Rollback:.*DROP\s+INDEX\s+IF\s+EXISTS\s+idx_departments_active/i,
    /--\s*Rollback:.*ALTER\s+TABLE\s+public\.departments\s+DROP\s+CONSTRAINT\s+IF\s+EXISTS\s+departments_department_code_key/i,
    /--\s*Rollback:.*ALTER\s+TABLE\s+public\.departments\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+department_code/i,
    /--\s*Rollback:.*ALTER\s+TABLE\s+public\.departments\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+is_active/i,
    /--\s*Rollback:.*ALTER\s+TABLE\s+public\.departments\s+RENAME\s+COLUMN\s+department_name\s+TO\s+name/i
  ];

  rollbackPatterns.forEach((pattern) => {
    assert.match(
      combinedSql,
      pattern,
      'Expected rollback documentation for departments schema migration'
    );
  });
});
